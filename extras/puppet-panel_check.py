#!/usr/bin/python2
# coding=utf-8
#
# Usage:
#		puppet-panel_check.py <url> <apikey>

try:
	import requests, sys
except ImportError as e:
	print 'Missing check dependency: %s' % e
	exit(3)

try:
	# Disable requests warnings
	from requests.packages.urllib3.exceptions import InsecureRequestWarning
	requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

	# Get args
	if len(sys.argv) < 3:
		raise Exception('Usage: puppet-panel_check.py <url> <apikey>')
	url = sys.argv[1]
	apikey = sys.argv[2]

	# Get puppet-panel status
	result = requests.get('%s/api/status' % url, **{'verify': False, 'headers': {'Authorization': 'Api-Key %s' % apikey}})
	result.raise_for_status()
	status = result.json()

	# Get perfdata
	perfdata = ' '.join(['%s=%d' % (state, count) for state,count in status.iteritems()])

	# Handle critical/warning
	warnings=[]
	criticals=[]

	if status['failed']:		criticals.append('%d failed nodes' % status['failed'])
	if status['unreported']:	warnings.append('%d unreported nodes' % status['unreported'])
	if status['unknown']:		warnings.append('%d unknown nodes' % status['unknown'])

	# Show output
	if len(criticals):
		print 'CRITICAL - %s | %s' % (', '.join(criticals), perfdata)
		exit(2)
	elif len(warnings):
		print 'WARNING - %s | %s' % (', '.join(warnings), perfdata)
		exit(1)
	else:
		print 'OK - No failed node found'
		exit(0)
except Exception as e:
	print 'ERROR: %s' % str(e)
	exit(3)
