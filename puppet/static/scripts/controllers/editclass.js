'use strict';

angular.module('puppetPanel')
.controller('EditClassCtrl', ['$scope', '$uibModalInstance', '$http', 'ApiService', 'classData', function($scope, $uibModalInstance, $http, ApiService, classData) {
  var initialName = classData.name;
  $scope.class = angular.copy(classData);
  $scope.status = '';
  $scope.error = '';

  $scope.ok = function () {
    $scope.status = 'pending';
    ApiService.cleanErrorsInForm($scope.form);

    // Create new class
    if(initialName === undefined) {
      $http.post(ApiService.getConfig('url') + '/classes', $scope.class)
      .then(function(result) {
        $uibModalInstance.close(result.data);
      }, function(reason) {
        $scope.status = 'error';
        $scope.error = ApiService.convertErrorsToForm(reason.data, $scope.form);
      });
    }
    // Update existing class
    else {
      $http.put(ApiService.getConfig('url') + '/classes/' + initialName, $scope.class)
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
