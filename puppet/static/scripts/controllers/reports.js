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
.controller('ReportsCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$interval', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $interval, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.reports = {error: '', date: Date.now(), lastrefresh: null, data: []};
  $scope.reports.table = new NgTableParams({sorting: {start: "desc"}}, {});

  // A list of filters for the status column
  $scope.statuses = ApiService.statuses;

  // Get the reports
  var refresh = function() {
    $scope.reports.error = '';
    var page_reports = $scope.reports.table.page();

    $http.get(ApiService.getConfig('url') + '/reports')
    .then(function(result) {
      $scope.reports.data = result.data;
      $scope.reports.table.settings({dataset: $scope.reports.data});
      $scope.reports.table.page(page_reports);
      $scope.reports.lastrefresh = Date.now();
    }, function(reason) {
      $scope.reports.error = 'Error while loading reports informations.';
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
