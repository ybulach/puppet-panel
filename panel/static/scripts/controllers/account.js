'use strict';

angular.module('puppetPanel')
.controller('AccountCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$filter', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $filter, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.account = {error: '', success: '', status: ''};
  $scope.apikeys = {error: '', success: '', status: ''};
  $scope.apikeys.table = new NgTableParams({sorting: {created_at: "asc"}}, {});

  // Get the account infos
  $http.get(ApiService.getConfig('url') + '/account')
  .then(function(result) {
    $scope.account.data = result.data;
    $scope.account.initialEmail = result.data.email;
  }, function(reason) {
    $scope.account.error += 'Error while loading account informations.';
  });

  // Get the API keys
  $http.get(ApiService.getConfig('url') + '/apikeys')
  .then(function(result) {
    $scope.apikeys.data = result.data;
    $scope.apikeys.table.settings({dataset: $scope.apikeys.data});
  }, function(reason) {
    $scope.apikeys.error = 'Error while loading API keys.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
    $scope.account.status = '';
    $scope.apikeys.status = '';
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Change account infos
  $scope.account.submit = function () {
    $scope.account.error = $scope.account.success = '';
    ApiService.cleanErrorsInForm($scope.account.form);

    // Change email
    if($scope.account.data.email != $scope.account.initialEmail) {
      $scope.account.status = 'pending';

      $http.put(ApiService.getConfig('url') + '/account', {email: $scope.account.data.email})
      .then(function(result) {
        $scope.account.data = result.data;
        $scope.account.initialEmail = result.data.email;
        $scope.account.success += 'Email changed successfully. ';
      }, function(reason) {
        var error = ApiService.convertErrorsToForm(reason.data, $scope.account.form);
        if(error)
          $scope.account.error += 'Email change failed: ' + error + '. ';
      });
    }

    // Change password
    if($scope.account.data.current_password) {
      $scope.account.status = 'pending';

      $http.post(ApiService.getConfig('url') + '/password', {current_password: $scope.account.data.current_password, new_password: $scope.account.data.new_password})
      .then(function(result) {
        $scope.account.data.current_password = '';
        $scope.account.data.new_password = '';
        $scope.account.success += 'Password changed successfully. ';
      }, function(reason) {
        var error = ApiService.convertErrorsToForm(reason.data, $scope.account.form);
        if(error)
          $scope.account.error += 'Password change failed: ' + error + '. ';
      });
    }
  };

  // Create and delete API keys
  $scope.apikeys.create = function () {
    $scope.apikeys.status = 'pending';
    $scope.apikeys.error = $scope.apikeys.success = '';
    ApiService.cleanErrorsInForm($scope.apikeys.form);

    $http.post(ApiService.getConfig('url') + '/apikeys', {email: $scope.apikeys.data.email})
    .then(function(result) {
      $scope.apikeys.data.push(result.data);
      $scope.apikeys.table.settings({dataset: $scope.apikeys.data});
      $scope.apikeys.success = 'New API key created successfully: ' + result.data.key;
    }, function(reason) {
      var error = ApiService.convertErrorsToForm(reason.data, $scope.apikeys.form);
      if(error)
        $scope.apikeys.error = 'API key creation failed: ' + error;
    });
  };

  $scope.apikeys.delete = function(key) {
    $scope.apikeys.error = $scope.apikeys.success = '';

    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/apikeys/' + key;
        }
      }
    });

    modalInstance.result.then(function() {
      var filtered = $filter('filter')($scope.apikeys.data, {'key': key}, true);
      if(filtered.length)
        $scope.apikeys.data.splice($scope.apikeys.data.indexOf(filtered[0]), 1);
      $scope.apikeys.table.settings({dataset: $scope.apikeys.data});
    });
  };
}]);
