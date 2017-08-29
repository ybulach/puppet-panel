# This file is part of puppet-panel.
#
# puppet-panel is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# puppet-panel is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with puppet-panel.  If not, see <http://www.gnu.org/licenses/>.

from base64 import b64encode
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.PublicKey import RSA
from Crypto import Random
from django.core import exceptions
from django.conf import settings
from django.db import models
import requests

import utils, validators

class Class(models.Model):
    name = models.CharField(max_length=255, unique=True, validators=[validators.validate_class_name])
    default = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = 'Classes'

    def __unicode__(self):
        return "{0}".format(self.name, )

class Group(models.Model):
    name = models.CharField(max_length=255, unique=True, validators=[validators.validate_group_name])
    default = models.BooleanField(default=False)
    parents = models.ManyToManyField('Group', blank=True)
    classes = models.ManyToManyField(Class, related_name='groups', blank=True)

    def __unicode__(self):
        return "{0}".format(self.name, )

class Node(models.Model):
    name = models.CharField(max_length=255, unique=True, validators=[validators.validate_node_name])
    groups = models.ManyToManyField(Group, related_name='nodes', blank=True)
    classes = models.ManyToManyField(Class, related_name='nodes', blank=True)

    def __unicode__(self):
        return "{0}".format(self.name, )

    # Do additional stuff on node creation
    def save(self, *args, **kwargs):
        if not self.pk:
            # Sign certificate (if known by PuppetCA)
            try:
                utils.puppetca_query('PUT', 'certificate_status/%s' % self.name, data={'desired_state': 'signed'})
            except Exception:
                pass

        # Save/create node
        super(Node, self).save(*args, **kwargs)

    # Do additional stuff on node deletion
    def delete(self, *args, **kwargs):
        # Deactivate in PuppetDB
        try:
            utils.puppetdb_deactivate_node(self.name)
        except Exception as e:
            raise Exception('Can\'t deactivate orphan in PuppetDB: %s' % e)

        # Revoke certificate (if known by PuppetCA, only works when certificate is not in 'requested' state)
        try:
            utils.puppetca_query('PUT', 'certificate_status/%s' % self.name, data={'desired_state': 'revoked'})
        except Exception as e:
            if not isinstance(e, requests.exceptions.HTTPError) or not e.response.status_code in [404, 409]:
                raise Exception('Can\'t revoke orphan certificate in PuppetCA: %s' % e)

        # Delete certificate (if known by PuppetCA)
        try:
            utils.puppetca_query('DELETE', 'certificate_status/%s' % self.name)
        except Exception as e:
            if not isinstance(e, requests.exceptions.HTTPError) or e.response.status_code != 404:
                raise Exception('Can\'t delete orphan in PuppetCA: %s' % e)

        super(Node, self).delete(*args, **kwargs)

class Parameter(models.Model):
    name = models.CharField(max_length=255, validators=[validators.validate_parameter_name])
    value = models.TextField(null=True, blank=True)
    encryption_key = models.CharField(max_length=512, null=True, blank=True)
    encrypted = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def __init__(self, *args, **kwargs):
        super(Parameter, self).__init__(*args, **kwargs)

        # Keep a copy for later comparison
        self.initial_value = self.value
        self.initial_encryption_key = self.encryption_key
        self.initial_encrypted = self.encrypted

    def __unicode__(self):
        return "{0}".format(self.name, )

    # Validate fields
    def clean(self):
        # New object or changed value, encrypt it if needed
        if (self.initial_value != self.value) or not self.pk:
            if self.encrypted:
                self.encrypt()

        # Changed encryption
        elif self.initial_encrypted != self.encrypted:
            # Added encryption
            if self.encrypted:
                self.encrypt()

            # Removed encryption
            else:
                raise exceptions.ValidationError({'encrypted': 'Can\'t remove encryption of an already encrypted value'})

        # Changed encryption key
        elif self.initial_encryption_key != self.encryption_key:
            if self.initial_encrypted:
                raise exceptions.ValidationError({'encryption_key': 'Can\'t change encryption key of an encrypted value'})

        # Remove unneeded encryption_key
        if not self.encrypted:
            self.encryption_key = ''

    # Encrypt value if needed
    def encrypt(self):
        if not hasattr(settings, 'PUPPET_ENCRYPTION_PUBKEY'):
            raise exceptions.ValidationError({'encrypted': 'Can\'t encrypt value: missing PUPPET_ENCRYPTION_PUBKEY setting variable'})

        try:
            with open(settings.PUPPET_ENCRYPTION_PUBKEY) as file:
                pubkey = RSA.importKey(file.read())
        except Exception as e:
            raise exceptions.ValidationError({'encrypted': 'Public key error: %s' % e})

        # Only intercept exceptions related to provided datas (not pycrypto possible exceptions)
        try:
            value = self.value.encode('utf-8')
        except ValueError as e:
            raise exceptions.ValidationError({'encrypted': 'Can\'t encode value as UTF-8: %s' % e})

        try:
            # Encrypt data with an AES-128-CFB symetric key (for plaintext values too big for PKCS1_OAEP)
            # We need to pad manually the data, as pyCrypto doesn't do it
            key = Random.new().read(16)
            iv = Random.new().read(AES.block_size)

            pad = lambda s: s + (AES.block_size - len(s) % AES.block_size) * chr(AES.block_size - len(s) % AES.block_size)
            self.value = b64encode(AES.new(key, AES.MODE_CBC, iv).encrypt(pad(value)))

            # AES key is then encrypted with public key to ensure key security (only puppetserver can decrypt it)
            # First 16 bytes (AES.block_size) are for the initialization vector (IV)
            self.encryption_key = b64encode(iv + PKCS1_OAEP.new(pubkey).encrypt(key))
        except Exception as e:
            raise exceptions.ValidationError({'encrypted': 'Can\'t encrypt value: %s' % e})

class GroupParameter(Parameter):
    group = models.ForeignKey(Group, related_name='parameters')

    class Meta:
        unique_together = (("name", "group"),)

class NodeParameter(Parameter):
    node = models.ForeignKey(Node, related_name='parameters')

    class Meta:
        unique_together = (("name", "node"),)

