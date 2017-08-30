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
.controller('ParametersCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.parameters = {error: '', data: []};
  $scope.parameters.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // Get the parameters
  $http.get(ApiService.getConfig('url') + '/parameters')
  .then(function(result) {
    $scope.parameters.data = result.data;
    $scope.parameters.table.settings({dataset: $scope.parameters.data});
  }, function(reason) {
    $scope.parameters.error = 'Error while loading parameters informations.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });
}]);
