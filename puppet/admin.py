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

    class GroupAdminForm(forms.ModelForm):
        parents = forms.ModelMultipleChoiceField(required=False, widget=admin.widgets.FilteredSelectMultiple('Parent groups', is_stacked=False), queryset=models.Group.objects.all())
        classes = forms.ModelMultipleChoiceField(required=False, widget=admin.widgets.FilteredSelectMultiple('Classes', is_stacked=False), queryset=models.Class.objects.all())

        def __init__(self, *args, **kwargs):
            super(GroupAdmin.GroupAdminForm, self).__init__(*args, **kwargs)

            # Exclude this group from the list
            self.fields['parents'].queryset = self.fields['parents'].queryset.exclude(name=self.instance.name)

    form = GroupAdminForm

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
        classes = forms.ModelMultipleChoiceField(required=False, widget=admin.widgets.FilteredSelectMultiple('Classes', is_stacked=False), queryset=models.Class.objects.all())

    form = NodeAdminForm

# Add models in administration
admin.site.register(models.Group, GroupAdmin)
admin.site.register(models.Node, NodeAdmin)
admin.site.register(models.Class)

