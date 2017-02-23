from django.conf.urls import include, url
from rest_framework_nested import routers

import views

# REST routes and nested routes
router = routers.SimpleRouter(trailing_slash=False)
router.register(r'classes', views.ClassViewSet)
router.register(r'groups', views.GroupViewSet)
router.register(r'nodes', views.NodeViewSet)

groups_router = routers.NestedSimpleRouter(router, r'groups', lookup='group', trailing_slash=False)
groups_router.register(r'parameters', views.GroupParameterViewSet, base_name='group-parameters')

nodes_router = routers.NestedSimpleRouter(router, r'nodes', lookup='node', trailing_slash=False)
nodes_router.register(r'parameters', views.NodeParameterViewSet, base_name='node-parameters')

# Resulting routes
urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^', include(groups_router.urls)),
    url(r'^', include(nodes_router.urls)),
]
