from django import forms
from django.contrib import admin

import models

# Add parameters in groups administration forms
class GroupParameterInline(admin.TabularInline):
    model = models.GroupParameter
    extra = 0

    # Additional fields
    class GroupParameterAdminForm(forms.ModelForm):
        class Meta:
            model = models.GroupParameter
            fields = ('name', 'value', 'encrypted',)

    form = GroupParameterAdminForm

class GroupAdmin(admin.ModelAdmin):
    inlines = [
        GroupParameterInline,
    ]
    list_display = ('name',)
    ordering = ['name']
    search_fields = ('name',)

# Add parameters in nodes administration forms
class NodeParameterInline(admin.TabularInline):
    model = models.NodeParameter
    extra = 0

    # Additional fields
    class NodeParameterAdminForm(forms.ModelForm):
        class Meta:
            model = models.NodeParameter
            fields = ('name', 'value', 'encrypted',)

    form = NodeParameterAdminForm

class NodeAdmin(admin.ModelAdmin):
    inlines = [
        NodeParameterInline,
    ]
    list_display = ('name',)
    ordering = ['name']
    search_fields = ('name',)

    class NodeAdminForm(forms.ModelForm):
        groups = forms.ModelMultipleChoiceField(required=False, widget=admin.widgets.FilteredSelectMultiple('Groups', is_stacked=False), queryset=models.Group.objects.all())

    form = NodeAdminForm

# Add models in administration
admin.site.register(models.Group, GroupAdmin)
admin.site.register(models.Node, NodeAdmin)

