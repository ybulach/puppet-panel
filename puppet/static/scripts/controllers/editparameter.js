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
.controller('EditParameterCtrl', ['$scope', '$uibModalInstance', '$http', 'ApiService', 'base_url', 'parameterData', function($scope, $uibModalInstance, $http, ApiService, base_url, parameterData) {
  var initialName = parameterData.name;
  $scope.parameter = angular.copy(parameterData);
  $scope.status = '';
  $scope.error = '';

  $scope.ok = function () {
    $scope.status = 'pending';
    ApiService.cleanErrorsInForm($scope.form);

    // Create new parameter
    if(initialName === undefined) {
      $http.post(base_url, $scope.parameter)
      .then(function(result) {
        $uibModalInstance.close(result.data);
      }, function(reason) {
        $scope.status = 'error';
        $scope.error = ApiService.convertErrorsToForm(reason.data, $scope.form);
      });
    }
    // Update existing parameter
    else {
      $http.put(base_url + '/' + initialName, $scope.parameter)
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
