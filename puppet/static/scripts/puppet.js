// This file is part of puppet-panel.
//
// puppet-panel is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// puppet-panel is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with puppet-panel.  If not, see <http://www.gnu.org/licenses/>.

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
