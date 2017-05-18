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
