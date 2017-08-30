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
.controller('EditNodeCtrl', ['$scope', '$uibModalInstance', '$http', 'ApiService', 'nodeData', 'creation', function($scope, $uibModalInstance, $http, ApiService, nodeData, creation) {
  var initialName = nodeData.name;
  $scope.node = angular.copy(nodeData);
  $scope.classes = [];
  $scope.groups = [];
  $scope.status = '';
  $scope.error = '';

  // Get classes
  $http.get(ApiService.getConfig('url') + '/classes').then(function(result) {
    $scope.classes = [];
    result.data.forEach(function(item) {
      $scope.classes.push(item.name);
    });
  }, function(reason) {
    $scope.classes = ['List unavailable'];
    $scope.status = 'error';
    $scope.error += 'Can\'t get the list of classes. Refresh this form if you want to select one.';
  });

  // Get groups
  $http.get(ApiService.getConfig('url') + '/groups').then(function(result) {
    $scope.groups = [];
    result.data.forEach(function(item) {
      $scope.groups.push(item.name);
    });
  }, function(reason) {
    $scope.groups = ['List unavailable'];
    $scope.status = 'error';
    $scope.error += 'Can\'t get the list of groups. Refresh this form if you want to select one.';
  });

  $scope.ok = function () {
    $scope.error = '';
    $scope.status = 'pending';
    ApiService.cleanErrorsInForm($scope.form);

    // Create new node
    if((initialName === undefined) || creation) {
      $http.post(ApiService.getConfig('url') + '/nodes', $scope.node)
      .then(function(result) {
        $uibModalInstance.close(result.data);
      }, function(reason) {
        $scope.status = 'error';
        $scope.error = ApiService.convertErrorsToForm(reason.data, $scope.form);
      });
    }
    // Update existing node
    else {
      $http.put(ApiService.getConfig('url') + '/nodes/' + initialName, $scope.node)
      .then(function(result) {
        $uibModalInstance.close(result.data);
      }, function(reason) {
        $scope.status = 'error';
        $scope.error = ApiService.convertErrorsToForm(reason.data, $scope.form);
      });
    }
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
}]);
