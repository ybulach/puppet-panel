'use strict';

angular.module('puppetPanel')
.controller('GenericDeletionCtrl', ['$scope', '$uibModalInstance', '$http', 'url', 'ApiService', function($scope, $uibModalInstance, $http, url, ApiService) {
  $scope.status = '';
  $scope.error = '';

  $scope.ok = function () {
    $scope.status = 'pending';

    $http.delete(url).then(function() {
      $uibModalInstance.close();
    }, function(reason) {
      $scope.status = 'error';
      $scope.error = ApiService.convertErrorsToForm(reason.data, null);
    });
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
}]);
