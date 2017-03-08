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
