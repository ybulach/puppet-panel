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

from django.core import exceptions
from rest_framework import serializers
import rest_framework.exceptions
import requests.exceptions

import models
import utils

# A serializer that validate its fields using the model 'clean()' method
class ValidatedSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        # Validate on an empty model if it is going to be created
        instance = self.instance if self.instance else self.Meta.model()

        # Add write-only fields for validation
        for field in self.Meta.fields:
            setattr(instance, field, attrs[field] if field in attrs else '')

        try:
            instance.clean()
        except exceptions.ValidationError as e:
            raise serializers.ValidationError(e.error_dict if hasattr(e, 'error_dict') else e)

        return {field:getattr(instance, field) for field in self.Meta.fields}

# Classes
class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Class
        fields = ('name', )

# Reports
class ReportSerializer_Light(serializers.Serializer):
    transaction = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)
    node = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)
    agent_version = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)
    status = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)
    start = serializers.DateTimeField(required=True)
    end = serializers.DateTimeField(required=True)
    run_time = serializers.SerializerMethodField()

    # Method fields
    def get_run_time(self, obj):
        return obj.run_time.total_seconds()

class ReportSerializer_Full(ReportSerializer_Light):
    logs = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()

    # Method fields
    def get_logs(self, obj):
        return [{
            'source': log['source'],
            'level': log['level'],
            'time': log['time'],
            'message': log['message'],
            'file': '%s:%s' % (log['file'], log['line']) if log['file'] and log['line'] else ''
        } for log in obj.logs]

    def get_events(self, obj):
        return [{
           'resource': '%s[%s]' % (event.item['type'], event.item['title']),
           'message': event.item['message'],
           'status': event.status
        } for event in obj.events()]

# Parameters (used in global listing)
class ParameterSerializer(serializers.Serializer):
    group = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)
    node = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)
    name = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)
    value = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)
    encrypted = serializers.BooleanField(default=False)

    class Meta:
        fields = ('group', 'node', 'name', 'value', 'encrypted')

# Groups
class GroupParameterSerializer(ValidatedSerializer):
    encrypted = serializers.BooleanField(default=False)

    class Meta:
        model = models.GroupParameter
        fields = ('name', 'value', 'encryption_key', 'encrypted')

class GroupSerializer_Light(serializers.ModelSerializer):
    classes = serializers.SlugRelatedField(slug_field='name', queryset=models.Class.objects.all(), many=True, required=False)
    parents = serializers.SlugRelatedField(slug_field='name', queryset=models.Group.objects.all(), many=True, required=False)

    class Meta:
        model = models.Group
        fields = ('name', 'parents', 'classes')
        read_only_fields = ()

class GroupSerializer_Full(GroupSerializer_Light):
    parameters = GroupParameterSerializer(many=True, read_only=True)

    class Meta(GroupSerializer_Light.Meta):
        fields = GroupSerializer_Light.Meta.fields + ('parameters',)
        read_only_fields = GroupSerializer_Light.Meta.read_only_fields + ('parameters',)

# Nodes
class NodeParameterSerializer(ValidatedSerializer):
    encrypted = serializers.BooleanField(default=False)

    class Meta:
        model = models.NodeParameter
        fields = ('name', 'value', 'encryption_key', 'encrypted')

class NodeSerializer_Light(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    report_timestamp = serializers.SerializerMethodField()
    catalog_timestamp = serializers.SerializerMethodField()
    facts_timestamp = serializers.SerializerMethodField()

    class Meta:
        model = models.Node
        fields = ('name', 'status', 'report_timestamp', 'catalog_timestamp', 'facts_timestamp')
        read_only_fields = ('status', 'report_timestamp', 'catalog_timestamp', 'facts_timestamp')

    def get_node(self, name):
        # Load the nodes
        if not hasattr(self, 'node'):
            self.node = {}

            try:
                db = utils.puppetdb_connect()
                for node in db.nodes(with_status=True):
                    self.node[node.name] = node
            except Exception as e:
                raise rest_framework.exceptions.APIException('Can\'t get node from PuppetDB: %s' % e)

        # Not found node
        if not name in self.node:
            self.node[name] = None

        return self.node[name]

    # Method fields
    def get_status(self, obj):
        node = self.get_node(obj.name)
        return node.status if node else 'unknown'

    def get_report_timestamp(self, obj):
        node = self.get_node(obj.name)
        return node.report_timestamp if node else None

    def get_catalog_timestamp(self, obj):
        node = self.get_node(obj.name)
        return node.catalog_timestamp if node else None

    def get_facts_timestamp(self, obj):
        node = self.get_node(obj.name)
        return node.facts_timestamp if node else None

class NodeSerializer_Full(NodeSerializer_Light):
    classes = serializers.SlugRelatedField(slug_field='name', queryset=models.Class.objects.all(), many=True, required=False)
    groups = serializers.SlugRelatedField(slug_field='name', queryset=models.Group.objects.all(), many=True, required=False)
    parameters = NodeParameterSerializer(many=True, read_only=True)
    reports = serializers.SerializerMethodField()

    class Meta(NodeSerializer_Light.Meta):
        fields = NodeSerializer_Light.Meta.fields + ('groups', 'classes', 'parameters', 'reports')
        read_only_fields = NodeSerializer_Light.Meta.read_only_fields + ('parameters', 'reports')

    # Method fields
    def get_reports(self, obj):
        node = self.get_node(obj.name)
        return ReportSerializer_Light(node.reports(), many=True).data if node else []

class NodeSerializer_Enc(serializers.Serializer):
    classes = serializers.StringRelatedField(many=True)
    parameters = NodeParameterSerializer(many=True)

# Orphans
class OrphanSerializer(serializers.Serializer):
    name = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)
    source = serializers.CharField(allow_blank=False, trim_whitespace=False, required=True)

# Nodes status
class StatusSerializer(serializers.Serializer):
    unchanged = serializers.IntegerField(min_value=0, required=True)
    changed = serializers.IntegerField(min_value=0, required=True)
    failed = serializers.IntegerField(min_value=0, required=True)
    unreported = serializers.IntegerField(min_value=0, required=True)
    unknown = serializers.IntegerField(min_value=0, required=True)
    total = serializers.IntegerField(min_value=0, required=True)

# Certificates
class CertificateSerializer_Read(serializers.Serializer):
    name = serializers.CharField(allow_blank=False, trim_whitespace=False)
    dns_alt_names = serializers.ListField(serializers.CharField(allow_blank=False, trim_whitespace=False))
    state = serializers.CharField(allow_blank=False, trim_whitespace=False)
    fingerprint = serializers.CharField(allow_blank=False, trim_whitespace=False)

class CertificateSerializer_Write(serializers.Serializer):
    state = serializers.ChoiceField(['signed', 'revoked'], allow_blank=False)
