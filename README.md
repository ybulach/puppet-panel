# puppet-panel

A Puppet dashboard+ENC with encrypted parameters

![Homepage](/screenshot.png?raw=true "Homepage")

## Presentation
This project aims to provide a panel/dashboard to ease day to day administration of Puppet:

* External Node Controller: define classes and parameters on nodes/groups to use them directly in your Puppet code.
* Encrypted parameters: to improve security, parameter can be encrypted using a public key. Only the private key owned by Puppet master (via the ENC script) can decrypt this parameters and use them in your Puppet code.
* Report visualization and nodes status: using PuppetDB data.

## Requirements
This panel is made for **Puppet Collection 1 (aka PC1)** and requires PuppetDB. It is developped using Python 2 and AngularJS.

Python requirements are available in the `requirements.txt` file.

AngularJS requirements are available in the `bower.json` file.

Here are dependencies for Debian:

    apt-get install python-pip python-virtualenv python-dev libmysqlclient-dev libffi-dev npm
    npm install -g bower yuglify

## Configure PuppetMaster
**This does not show how to install and configure Puppet. Refere to the official wiki for documentation.**

First, you need to generate a new certificate in PuppetCA, that will be used to connect to PuppetCA and PuppetDB (the `_client` certificate), and to encrypt parameters (the `_encryption` certificate).

    puppet cert generate puppetpanel-client
    puppet cert generate puppetpanel-encryption --keylength 2048

**INFO**: The encryption key size is fixed at 2048 bits, because of a limitation defined in the database schema (content encrypted with keys of 4096 bits will be truncated).

The required files that need to be copied to the PuppetPanel server are then:

* `/etc/puppetlabs/puppet/ssl/certs/ca.pem`: will be used to verify server certificate when connecting to PuppetDB and PuppetCA (may be renamed `ca.crt`)
* `/etc/puppetlabs/puppet/ssl/certs/puppetpanel-client.pem`: will be used for SSL connection to PuppetDB and PuppetCA (may be renamed `puppetpanel-client.crt`)
* `/etc/puppetlabs/puppet/ssl/private_keys/puppetpanel-client.pem`: will be used for SSL connection to PuppetDB and PuppetCA (may be renamed `puppetpanel-client.key`)
* `/etc/puppetlabs/puppet/ssl/public_keys/puppetpanel-encryption.pem`: will be used to encrypt parameters (may be renamed `puppetpanel-encryption.pub`)

Edit `/etc/puppetlabs/puppetserver/conf.d/auth.conf` to allow access to PuppetCA with the `puppetpanel-client` certificate:

    {
        # Allow puppet-panel to manage certificates
        match-request: {
            path: "^/puppet-ca/v1/certificate_status(es)?/(.*)$"
            type: regex
            method: [get, put, delete]
        }
        allow: "puppetpanel-client"
        sort-order: 500
        name: "puppetlabs certificate status"
    },

To add the ENC script:

    cd /etc/puppetlabs/puppet
    wget https://raw.githubusercontent.com/ybulach/puppet-panel/master/extras/puppet-panel_enc.rb
    chmod +x puppet-panel_enc.rb

    wget https://raw.githubusercontent.com/ybulach/puppet-panel/master/extras/puppet-panel.yaml.sample -O puppet-panel.yaml

And edit the `puppet-panel.yaml` file to match your PuppetPanel `url` and `authorization` (you can generate an Api-Key from an administrator user settings, after PuppetPanel installation and configuration below). The `private_key` is already set with the one generated above.

Then, the `/etc/puppetlabs/puppet/puppet.conf` needs to be modified:

    [main]
    ...
    node_terminus = exec
    external_nodes = /opt/puppetlabs/puppet/bin/ruby $confdir/puppet-panel_enc.rb
    reports = puppetdb
    ...

    [master]
    ...
    storeconfigs = true
    storeconfigs_backend = puppetdb
    ...

Your PuppetDB server must be installed and the `puppetdb.conf` configuration must work.

Finally, restart the `puppetserver` service:

    service puppetserver restart

### Installation
To install PuppetPanel on production server, a specific user and a virtualenv are recommended. Installation here is shown in `/opt/puppet-panel` with `puppet-panel` user.

    useradd puppet-panel -d /opt/puppet-panel -m -s /bin/bash
    su puppet-panel
    cd /opt/puppet-panel
    mkdir env app
    virtualenv env/
    source env/bin/activate
    cd app
    git clone https://github.com/ybulach/puppet-panel .
    pip install -r requirements
    bower install

If you want to activate virtualenv every time you `su` as this user:

    echo "source ~/env/bin/activate" >> /opt/puppet-panel/.bashrc

As an example, `nginx` and `uwsgi` are used to serve the Python app:

    apt-get install nginx uwsgi

Here is a sample `/etc/uwsgi/apps-enabled/puppet-panel.ini` configuration:

    [uwsgi]
    env = DJANGO_SETTINGS_MODULE=panel.settings
    module = panel.wsgi:application
    chdir = /opt/puppet-panel/app
    virtualenv=/opt/puppet-panel/env
    uid=puppet-panel
    chown-socket = puppet-panel:www-data
    logto = /var/log/uwsgi/app/puppet-panel.log

And here is a sample `/etc/nginx/sites-enabled/puppet-panel.conf` configuration (with SSL enabled):

    server {
      listen      80;
      server_name panel.puppet.domain.tld;
      return 301 https://$server_name$request_uri;
    }

    server {
      listen 443;
      server_name panel.puppet.domain.tld;

      ssl on;
      ssl_certificate ssl/panel.puppet.domain.tld.crt;
      ssl_certificate_key ssl/panel.puppet.domain.tld.key;

      access_log  /var/log/nginx/puppet-panel.log;
      location /static/ {
        alias /opt/puppet-panel/app/static/;
      }
      location / {
        uwsgi_pass unix:///run/uwsgi/app/puppet-panel/socket;
        include uwsgi_params;
      }
    }

Then restart and enable services on boot:

    systemctl restart nginx
    systemctl restart uwsgi
    systemctl enable nginx
    systemctl enable uwsgi

As seen in the PuppetMaster configuration part above, the following SSL keys must be copied on the PuppetPanel server (on the root of the PuppetPanel installation, here `/opt/puppet-panel/app`):

* `ca.crt`
* `puppetpanel-client.crt`
* `puppetpanel-client.key`
* `puppetpanel-encryption.pub`

### Upgrade
To upgrade an existing PuppetPanel installation, you need to `su` as the specific user (here `puppet-panel`) and execute:

    su puppet-panel
    source /opt/puppet-panel/env/bin/activate
    cd /opt/puppet-panel/app
    git pull
    pip install -r requirements.txt --upgrade
    python manage.py migrate

You may need to reload `wsgi` to make sure changes are taken in account:

    systemctl reload uwsgi

## Configuration
The `panel/settings_local.py` must be configured properly in order for PuppetPanel to work. A sample file can be used:

    cp panel/settings_local.py.sample panel/settings_local.py

**INFO**: When modifying configuration, you need to reload `uwsgi` to make sure changes are taken in account:

    systemctl reload uwsgi

### Database (mandatory)
The `DATABASES` defaults to a sqlite3 database (the file `db.sqlite3` will be created on the root of your PuppetPanel installation).

If you want to use another database backend, here are examples (database must be created manually):

    # PostgreSQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql_psycopg2',
            'NAME': 'mydatabase',
            'USER': 'mydatabaseuser',
            'PASSWORD': 'mypassword',
            'HOST': '127.0.0.1',
            'PORT': '5432',
        }
    }

    # MySQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'OPTIONS' : { "init_command": "SET foreign_key_checks = 0;" },
            'NAME': 'mydatabase',
            'USER': 'mydatabaseuser',
            'PASSWORD': 'mypassword',
            'HOST': '127.0.0.1',
            'PORT': '',
        }
    }

When modifying the database, you will need to populate it and create a superadmin account by executing (on the root of your PuppetPanel installation):

    python manage.py migrate
    python manage.py createsuperuser

### PuppetDB and PuppetCA (mandatory)
Define here the hostnames of your PuppetDB server. `PUPPETDB_PORT` might be changed to match your configuration, and `PUPPETDB_SSL` might be disabled if you are using plain HTTP (not recommended).

    # Puppet DB
    PUPPETDB_HOST = 'db.puppet.domain.tld'
    PUPPETDB_PORT = '8081'
    PUPPETDB_SSL = True

Then define the hostname of your PuppetCA server. The port of PuppetCA can't be changed and it is 8140 (defaut `puppetmaster` port).

    # Puppet CA
    PUPPETCA_HOST = 'ca.puppet.domain.tld'

### Encryption (recommended)
**INFO**: if no encryption is available, PuppetPanel will still work with plain parameters.

For encryption configuration, we are considering the names of SSL keys/certificates shown in the installation part:

    # Puppet
    PUPPET_ENCRYPTION_PUBKEY = 'puppetpanel-encryption.pub'
    PUPPET_CA_CRT = 'ca.crt'
    PUPPET_CLIENT_CRT = 'puppetpanel-client.crt'
    PUPPET_CLIENT_KEY = 'puppetpanel-client.key'

### LDAP Authentication (optional)
In order to use LDAP authentication, you need to install those dependencies (inside the virtualenv):

    pip install python-ldap django-auth-ldap

Add this configuration to your `panel/settings_local.py` (here for OpenLDAP) and change it according to your needs:

    # OpenLDAP

    AUTHENTICATION_BACKENDS = (
        'django_auth_ldap.backend.LDAPBackend',
        'django.contrib.auth.backends.ModelBackend',
    )

    import ldap
    from django_auth_ldap.config import LDAPSearch, GroupOfNamesType

    AUTH_LDAP_SERVER_URI = "ldap://ldap.domain.tld"

    #AUTH_LDAP_BIND_DN = "cn=admin,dc=domain,dc=tld"
    #AUTH_LDAP_BIND_PASSWORD = "root"

    AUTH_LDAP_USER_SEARCH = LDAPSearch("ou=people,dc=domain,dc=tld", ldap.SCOPE_SUBTREE, "(uid=%(user)s)")

    AUTH_LDAP_GROUP_SEARCH = LDAPSearch("ou=groups,dc=domain,dc=tld", ldap.SCOPE_SUBTREE, "(objectClass=groupOfNames)")
    AUTH_LDAP_GROUP_TYPE = GroupOfNamesType('uid')

    AUTH_LDAP_REQUIRE_GROUP = "cn=PUPPET-Users,ou=groups,dc=domain,dc=tld"

    AUTH_LDAP_USER_FLAGS_BY_GROUP = {
        "is_active": "cn=PUPPET-Users,ou=groups,dc=domain,dc=tld",
        "is_staff": "cn=PUPPET-Users,ou=groups,dc=domain,dc=tld",
        "is_superuser": "cn=PUPPET-Users,ou=groups,dc=domain,dc=tld"
    }

Here is an example for Active Directory:

    # Active Directory

    AUTHENTICATION_BACKENDS = (
        'django_auth_ldap.backend.LDAPBackend',
        'django.contrib.auth.backends.ModelBackend',
    )

    import ldap
    from django_auth_ldap.config import LDAPSearch, NestedActiveDirectoryGroupType

    AUTH_LDAP_SERVER_URI = "ldap://ad.domain.tld"

    AUTH_LDAP_BIND_DN = "cn=puppet,ou=Users,dc=domain,dc=tld"
    AUTH_LDAP_BIND_PASSWORD = "root"

    AUTH_LDAP_USER_SEARCH = LDAPSearch("OU=Users,DC=domain,dc=tld", ldap.SCOPE_SUBTREE, "(sAMAccountName=%(user)s)")

    AUTH_LDAP_GROUP_SEARCH = LDAPSearch("ou=Groups,DC=domain,dc=tld", ldap.SCOPE_SUBTREE, "(objectClass=group)")
    AUTH_LDAP_GROUP_TYPE = NestedActiveDirectoryGroupType()

    AUTH_LDAP_REQUIRE_GROUP = "CN=PUPPET-Users,ou=Groups,DC=domain,dc=tld"

    #AUTH_LDAP_CACHE_GROUPS = True
    #AUTH_LDAP_GROUP_CACHE_TIMEOUT = 300

    AUTH_LDAP_USER_FLAGS_BY_GROUP = {
        "is_active": "CN=PUPPET-Users,ou=Groups,DC=domain,dc=tld",
        "is_staff": "CN=PUPPET-Users,ou=Groups,DC=domain,dc=tld",
        "is_superuser": "CN=PUPPET-Users,ou=Groups,DC=domain,dc=tld"
    }

    AUTH_LDAP_USER_ATTR_MAP = {
        "first_name": "givenName",
        "last_name": "sn",
        "email": "mail"
    }

Here, users from `ou=people,dc=domain,dc=tld` (or `OU=Users,DC=domain,dc=tld` in Active Directory) are imported if they are in the group `cn=PUPPET-Users,ou=groups,dc=domain,dc=tld`. Every user is by default set to active/staff/superadmin.
