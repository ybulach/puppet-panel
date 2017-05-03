from django.conf import settings
import pypuppetdb
import requests

# Connect to PuppetDB using all configuration parameters
def puppetdb_connect():
	# Basic configuration
	puppetdb_params = {
		'host': settings.PUPPETDB_HOST,
		'port': settings.PUPPETDB_PORT
	}

	# SSL specific configuration
	if settings.PUPPETDB_SSL:
		puppetdb_params.update({
			'ssl_verify': settings.PUPPET_CA_CRT,
			'ssl_cert': settings.PUPPET_CLIENT_CRT,
			'ssl_key': settings.PUPPET_CLIENT_KEY
		})

	return pypuppetdb.connect(**puppetdb_params)

# Connect to PuppetCA using all configuration parameters
def puppetca_query(method, url, data=''):
	puppetca_params = {
		'verify': settings.PUPPET_CA_CRT,
		'cert': (settings.PUPPET_CLIENT_CRT, settings.PUPPET_CLIENT_KEY)
	}

	if data:
		puppetca_params['json'] = data

	query = requests.request(method, 'https://%s:8140/puppet-ca/v1/%s' % (settings.PUPPETCA_HOST, url), **puppetca_params)
	query.raise_for_status()
	return query
