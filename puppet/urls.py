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

from django.conf.urls import include, url
from rest_framework_nested import routers

import views

# REST routes and nested routes
router = routers.SimpleRouter(trailing_slash=False)
router.register(r'certificates', views.CertificateViewSet, base_name='certificates')
router.register(r'classes', views.ClassViewSet)
router.register(r'groups', views.GroupViewSet)
router.register(r'nodes', views.NodeViewSet)
router.register(r'orphans', views.OrphanViewSet, base_name='orphans')
router.register(r'parameters', views.ParameterViewSet, base_name='parameters')
router.register(r'reports', views.ReportViewSet, base_name='reports')

groups_router = routers.NestedSimpleRouter(router, r'groups', lookup='group', trailing_slash=False)
groups_router.register(r'parameters', views.GroupParameterViewSet, base_name='group-parameters')
groups_router.register(r'classes', views.GroupClassViewSet, base_name='group-classes')
groups_router.register(r'groups', views.GroupGroupViewSet, base_name='group-groups')

nodes_router = routers.NestedSimpleRouter(router, r'nodes', lookup='node', trailing_slash=False)
nodes_router.register(r'parameters', views.NodeParameterViewSet, base_name='node-parameters')
nodes_router.register(r'classes', views.NodeClassViewSet, base_name='node-classes')
nodes_router.register(r'groups', views.NodeGroupViewSet, base_name='node-groups')
nodes_router.register(r'enc', views.NodeEncViewSet, base_name='node-enc')

# Resulting routes
urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^', include(groups_router.urls)),
    url(r'^', include(nodes_router.urls)),
]
