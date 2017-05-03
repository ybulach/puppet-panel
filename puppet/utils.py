from django.conf import settings
import pypuppetdb

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
