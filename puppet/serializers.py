from django.conf import settings
from django.core import exceptions
import pypuppetdb
from rest_framework import serializers
import rest_framework.exceptions
import requests.exceptions

import models

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

# Groups
class GroupParameterSerializer(ValidatedSerializer):
    class Meta:
        model = models.GroupParameter
        fields = ('name', 'value', 'encryption_key', 'encrypted')
        read_only_fields = ('encryption_key',)

class GroupSerializer(serializers.ModelSerializer):
    classes = ClassSerializer(many=True, read_only=True)
    parameters = GroupParameterSerializer(many=True, read_only=True)

    class Meta:
        model = models.Group
        fields = ('name', 'classes', 'parameters')
        read_only_fields = ('classes', 'parameters')

# Nodes
class NodeParameterSerializer(ValidatedSerializer):
    class Meta:
        model = models.NodeParameter
        fields = ('name', 'value', 'encryption_key', 'encrypted')
        read_only_fields = ('encryption_key',)

class NodeSerializer(serializers.ModelSerializer):
    classes = ClassSerializer(many=True, read_only=True)
    groups = GroupSerializer(many=True, read_only=True)
    parameters = NodeParameterSerializer(many=True, read_only=True)
    reports = serializers.SerializerMethodField()

    class Meta:
        model = models.Node
        fields = ('name', 'groups', 'classes', 'parameters', 'reports')
        read_only_fields = ('groups', 'classes', 'parameters','reports')

    def get_reports(self, obj):
        try:
            db = pypuppetdb.connect(host=settings.PUPPETDB_HOST, port=settings.PUPPETDB_PORT)
            node = db.node(obj.name)

            return [{
                'transaction': report.transaction,
                'start': report.start,
                'end': report.end
            } for report in node.reports()]
        except Exception as e:
            if isinstance(e, requests.exceptions.HTTPError) and e.response.status_code == 404:
                return []
            raise rest_framework.exceptions.APIException('Can\'t get reports from PuppetDB: %s' % e)
