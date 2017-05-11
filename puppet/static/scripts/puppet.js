'use strict';

angular.module('puppetPanel')
.config(['$routeProvider', function($routeProvider) {
  $routeProvider
    // Dashboard
    .when('/', {
      templateUrl: 'static/views/dashboard.html',
      controller: 'DashboardCtrl',
      reloadOnSearch: false
    })

    // Nodes
    .when('/nodes', {
      templateUrl: 'static/views/nodes.html',
      controller: 'NodesCtrl',
      reloadOnSearch: false
    })
    .when('/nodes/:name', {
      templateUrl: 'static/views/node.html',
      controller: 'NodeCtrl',
      reloadOnSearch: false
    })

    // Groups
    .when('/groups', {
      templateUrl: 'static/views/groups.html',
      controller: 'GroupsCtrl',
      reloadOnSearch: false
    })
    .when('/groups/:name', {
      templateUrl: 'static/views/group.html',
      controller: 'GroupCtrl',
      reloadOnSearch: false
    })

    // Classes
    .when('/classes', {
      templateUrl: 'static/views/classes.html',
      controller: 'ClassesCtrl',
      reloadOnSearch: false
    })
    .when('/classes/:name', {
      templateUrl: 'static/views/class.html',
      controller: 'ClassCtrl',
      reloadOnSearch: false
    })

    // Parameters
    .when('/parameters', {
      templateUrl: 'static/views/parameters.html',
      controller: 'ParametersCtrl',
      reloadOnSearch: false
    })

    // Reports
    .when('/reports', {
      templateUrl: 'static/views/reports.html',
      controller: 'ReportsCtrl',
      reloadOnSearch: false
    })
    .when('/reports/:transaction', {
      templateUrl: 'static/views/report.html',
      controller: 'ReportCtrl',
      reloadOnSearch: false
    })

    // Certificates
    .when('/certificates', {
      templateUrl: 'static/views/certificates.html',
      controller: 'CertificatesCtrl',
      reloadOnSearch: false
    });
}]);
