from django.core import exceptions
from rest_framework import serializers

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

# Nodes
class NodeParameterSerializer(ValidatedSerializer):
    class Meta:
        model = models.NodeParameter
        fields = ('name', 'value', 'encryption_key', 'encrypted')
        read_only_fields = ('encryption_key',)

class NodeSerializer(serializers.ModelSerializer):
    classes = serializers.SlugRelatedField(slug_field='name', queryset=models.Class.objects.all(), many=True, allow_null=True)
    groups = serializers.SlugRelatedField(slug_field='name', queryset=models.Group.objects.all(), many=True, allow_null=True)
    parameters = NodeParameterSerializer(many=True, read_only=True)

    class Meta:
        model = models.Node
        fields = ('name', 'groups', 'classes', 'parameters')
        read_only_fields = ('parameters',)

# Groups
class GroupParameterSerializer(ValidatedSerializer):
    class Meta:
        model = models.GroupParameter
        fields = ('name', 'value', 'encryption_key', 'encrypted')
        read_only_fields = ('encryption_key',)

class GroupSerializer(serializers.ModelSerializer):
    classes = serializers.SlugRelatedField(slug_field='name', queryset=models.Class.objects.all(), many=True, allow_null=True)
    parameters = GroupParameterSerializer(many=True, read_only=True)

    class Meta:
        model = models.Group
        fields = ('name', 'classes', 'parameters')
        read_only_fields = ('parameters',)
