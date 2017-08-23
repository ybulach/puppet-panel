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
.controller('UsersCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
    $location.path('/login');
    return;
  }

  $scope.users = {error: '', status: '', data: []};
  $scope.users.table = new NgTableParams({sorting: {username: "asc"}}, {});

  // Get the users
  $http.get(ApiService.getConfig('url') + '/users')
  .then(function(result) {
    $scope.users.data = result.data;
    $scope.users.table.settings({dataset: $scope.users.data});
  }, function(reason) {
    $scope.users.error = 'Error while loading users informations.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
    $scope.users.status = '';
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Create a user
  $scope.users.create = function(user) {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/edituser.html',
      controller: 'EditUserCtrl',
      appendTo: modalParent(),
      resolve: {
        userData: {}
      }
    })

    modalInstance.result.then(function(result) {
      $location.path('/users/' + result.username);
    });
  };
}]);
