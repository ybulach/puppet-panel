'use strict';

angular.module('puppetPanel')
.controller('CertificatesCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$filter', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $filter, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.certificates = {error: '', data: []};
  $scope.certificates.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // Get the certificates
  $http.get(ApiService.getConfig('url') + '/certificates')
  .then(function(result) {
    $scope.certificates.data = result.data;
    $scope.certificates.table.settings({dataset: $scope.certificates.data});
  }, function(reason) {
    $scope.certificates.error = 'Error while loading certificates informations.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Edit and delete certificates
  $scope.certificates.edit = function(certificate) {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editcertificate.html',
      controller: 'EditCertificateCtrl',
      appendTo: modalParent(),
      resolve: {
        certificateData: certificate
      }
    })

    modalInstance.result.then(function(result) {
      var page = $scope.certificates.table.page();

      var filtered = $filter('filter')($scope.certificates.data, {'name': certificate.name}, true);
      if(filtered.length)
        angular.copy(result, $scope.certificates.data[$scope.certificates.data.indexOf(filtered[0])]);

      $scope.certificates.table.settings({dataset: $scope.certificates.data});
      $scope.certificates.table.page(page);
    });
  };

  $scope.certificates.delete = function(certificate) {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/certificates/' + certificate.name;
        }
      }
    });

    modalInstance.result.then(function() {
      var page = $scope.certificates.table.page();

      var filtered = $filter('filter')($scope.certificates.data, {'name': certificate.name}, true);
      if(filtered.length)
        $scope.certificates.data.splice($scope.certificates.data.indexOf(filtered[0]), 1);

      $scope.certificates.table.settings({dataset: $scope.certificates.data});
      $scope.certificates.table.page(page);
    });
  };
}]);
