'use strict';

angular.module('puppetPanel')
.config(['$routeProvider', function($routeProvider) {
  $routeProvider
    // Nodes
    .when('/nodes', {
      templateUrl: 'static/views/nodes.html',
      controller: 'NodesCtrl'
    })
    .when('/nodes/:name', {
      templateUrl: 'static/views/node.html',
      controller: 'NodeCtrl'
    })

    // Reports
    .when('/reports/:transaction', {
      templateUrl: 'static/views/report.html',
      controller: 'ReportCtrl'
    });
}]);
