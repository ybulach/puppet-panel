'use strict';

angular.module('puppetPanel')
.controller('EditCertificateCtrl', ['$scope', '$uibModalInstance', '$http', 'ApiService', 'certificateData', function($scope, $uibModalInstance, $http, ApiService, certificateData) {
  $scope.certificate = angular.copy(certificateData);
  $scope.status = '';
  $scope.error = '';

  $scope.ok = function () {
    $scope.status = 'pending';
    ApiService.cleanErrorsInForm($scope.form);

    $http.put(ApiService.getConfig('url') + '/certificates/' + certificateData.name, $scope.certificate)
    .then(function(result) {
      $uibModalInstance.close($scope.certificate);
    }, function(reason) {
      $scope.status = 'error';
      $scope.error = ApiService.convertErrorsToForm(reason.data, $scope.form);
    });
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
}]);
