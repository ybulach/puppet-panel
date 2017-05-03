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
