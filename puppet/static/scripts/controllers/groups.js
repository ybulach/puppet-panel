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
.controller('GroupsCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.groups = {error: '', data: []};
  $scope.groups.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // Get the groups
  $http.get(ApiService.getConfig('url') + '/groups')
  .then(function(result) {
    $scope.groups.data = result.data;
    $scope.groups.table.settings({dataset: $scope.groups.data});
  }, function(reason) {
    $scope.groups.error = 'Error while loading groups informations.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Create a group
  $scope.groups.create = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editgroup.html',
      controller: 'EditGroupCtrl',
      appendTo: modalParent(),
      resolve: {
        groupData: {}
      }
    })

    modalInstance.result.then(function(result) {
      $location.path('/groups/' + result.name);
    });
  };
}]);
