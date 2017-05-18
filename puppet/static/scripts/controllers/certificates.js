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
.controller('CertificatesCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$filter', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $filter, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.certificates = {error: '', data: []};
  $scope.certificates.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // A list of filters for the state column
  $scope.states = function() {
    return [
      {id: 'requested', title: 'Requested'},
      {id: 'signed', title: 'Signed'},
      {id: 'revoked', title: 'Revoked'}
    ];
  };

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
