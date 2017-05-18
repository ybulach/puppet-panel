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
.controller('DashboardCtrl', ['$scope', '$location', '$http', '$filter', '$interval', 'ApiService', function($scope, $location, $http, $filter, $interval, ApiService) {
  if(!ApiService.loggedIn()) {
    $location.path('/login');
    return;
  }

  $scope.nodes = {error: '', lastrefresh: null, total: 0, data: {unchanged: 0, changed: 0, failed: 0, unreported: 0, unknown: 0}};

  // Get the nodes
  var refresh = function() {
    $scope.nodes.error = '';

    $http.get(ApiService.getConfig('url') + '/nodes')
    .then(function(result) {
      $scope.nodes.total = result.data.length;
      $scope.nodes.data.unchanged = $filter('filter')(result.data, {'status': 'unchanged'}, true).length;
      $scope.nodes.data.changed = $filter('filter')(result.data, {'status': 'changed'}, true).length;
      $scope.nodes.data.failed = $filter('filter')(result.data, {'status': 'failed'}, true).length;
      $scope.nodes.data.unreported = $filter('filter')(result.data, {'status': 'unreported'}, true).length;
      $scope.nodes.data.unknown = $filter('filter')(result.data, {'status': 'unknown'}, true).length;
      $scope.nodes.lastrefresh = Date.now();
    }, function(reason) {
      $scope.nodes.error = 'Error while loading nodes informations.';
    });
  };
  refresh();

  // Autorefresh
  var autorefresh = $interval(function() {
    refresh();
  }, 1000 * 15);

  $scope.$on("$destroy", function() {
    $interval.cancel(autorefresh);
  });
}]);
