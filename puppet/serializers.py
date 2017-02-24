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
        try:
            db = pypuppetdb.connect(host=settings.PUPPETDB_HOST, port=settings.PUPPETDB_PORT)
            return db.node(name)
        except Exception as e:
            if isinstance(e, requests.exceptions.HTTPError) and e.response.status_code == 404:
                return []
            raise rest_framework.exceptions.APIException('Can\'t get node from PuppetDB: %s' % e)

    # Method fields
    def get_status(self, obj):
        node = self.get_node(obj.name)
        return node.status

    def get_report_timestamp(self, obj):
        node = self.get_node(obj.name)
        return node.report_timestamp

    def get_catalog_timestamp(self, obj):
        node = self.get_node(obj.name)
        return node.catalog_timestamp

    def get_facts_timestamp(self, obj):
        node = self.get_node(obj.name)
        return node.facts_timestamp

class NodeSerializer_Full(NodeSerializer_Light):
    classes = ClassSerializer(many=True, read_only=True)
    groups = GroupSerializer(many=True, read_only=True)
    parameters = NodeParameterSerializer(many=True, read_only=True)
    reports = serializers.SerializerMethodField()

    class Meta(NodeSerializer_Light.Meta):
        fields = NodeSerializer_Light.Meta.fields + ('groups', 'classes', 'parameters', 'reports')
        read_only_fields = NodeSerializer_Light.Meta.read_only_fields + ('groups', 'classes', 'parameters', 'reports')

    # Method fields
    def get_reports(self, obj):
        node = self.get_node(obj.name)
        return [{
            'transaction': report.transaction,
            'start': report.start,
            'end': report.end
        } for report in node.reports()]
