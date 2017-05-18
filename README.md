# puppet-panel

A Puppet dashboard+ENC with encrypted parameters

## Presentation
This project aims to provide a panel/dashboard to ease day to day administration of Puppet:

* External Node Controller: define classes and parameters on nodes/groups to use them directly in your Puppet code.
* Encrypted parameters: to improve security, parameter can be encrypted using a public key. Only the private key owned by Puppet master (via the ENC script) can decrypt this parameters and use them in your Puppet code.
* Report visualization and nodes status: using PuppetDB data.

## Requirements
This panel is made for Puppet Collection 1 (aka PC1) and requires PuppetDB. It is developped using Python 2 and AngularJS.

Python requirements are available in the `requirements.txt` file.

AngularJS requirements are available in the `bower.json` file.

## Installation
### on the PuppetMaster server
**This does not show how to install and configure Puppet. Refere to the official wiki for documentation.**

First, you need to generate a new certificate in PuppetCA, that will be used to connect to PuppetCA and PuppetDB (the `_client` certificate), and to encrypt parameters (the `_encryption` certificate).

    puppet cert generate puppetpanel-client
    puppet cert generate puppetpanel-encryption

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

And edit the `puppet-panel.yaml` file to match your PuppetPanel `url` and `authorization` (you can generate an Api-Key from an administrator user settings, after PuppetPanel initial configuration below). The `private_key` is already set with the one generated above.

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

### on the PuppetPanel server
TODO

As seen in the installation part above, the following SSL keys must be copied on the PuppetPanel server (on the root of the PuppetPanel installation):

* `ca.crt`
* `puppetpanel-client.crt`
* `puppetpanel-client.key`
* `puppetpanel-encryption.pub`

## Configuration
The `panel/settings_local.py` must be configured properly in order for PuppetPanel to work. A sample file can be used:

    cp panel/settings_local.py.sample panel/settings_local.py

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

### Encryption
For this configuration variables, we are considering the names of SSL keys/certificates shown in the installation part:

    # Puppet
    PUPPET_ENCRYPTION_PUBKEY = 'puppetpanel-encryption.pub'
    PUPPET_CA_CRT = 'ca.crt'
    PUPPET_CLIENT_CRT = 'puppetpanel-client.crt'
    PUPPET_CLIENT_KEY = 'puppetpanel-client.key'

### LDAP Authentication (optional)
TODO
