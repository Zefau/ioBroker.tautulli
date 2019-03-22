'use strict';
const adapterName = require('./io-package.json').common.name;
const utils = require('@iobroker/adapter-core'); // Get common adapter utils


/*
 * internal libraries
 */
const Library = require(__dirname + '/lib/library.js');
const Tautulli = require('tautulli-api');
const params = require(__dirname + '/tautulli-parameters.json');

/*
 * variables initiation
 */
var adapter;
var library;
var tautulli, data;

/*
 * ADAPTER
 *
 */
function startAdapter(options)
{
	options = options || {};
	Object.assign(options,
	{
		name: adapterName
	});
	
	adapter = new utils.Adapter(options);
	library = new Library(adapter);

	/*
	 * ADAPTER READY
	 *
	 */
	adapter.on('ready', function()
	{
		// initialize Tautulli API
		if (!adapter.config.apiIp || !adapter.config.apiToken)
		{
			adapter.log.warn('IP or API token missing! Please go to settings and fill in IP and the API token first!');
			return;
		}
		
		// initialize tautulli class
		tautulli = new Tautulli(adapter.config.apiIp, adapter.config.apiPort || '8181', adapter.config.apiToken);
		
		retrieveData();
		if (adapter.config.refresh !== undefined && adapter.config.refresh > 10)
			setInterval(function() {retrieveData()}, Math.round(parseInt(adapter.config.refresh)*1000));
	});

	/*
	 * STATE CHANGE
	 *
	 */
	adapter.on('stateChange', function(id, state)
	{
		adapter.log.debug('State of ' + id + ' has changed ' + JSON.stringify(state) + '.');
		
	});
	
	/*
	 * ADAPTER UNLOAD
	 *
	 */
	adapter.on('unload', function(callback)
	{
		try
		{
			adapter.log.info('Adapter stopped und unloaded.');
			callback();
		}
		catch(e)
		{
			callback();
		}
	});

	return adapter;	
};


/**
 * Verify is API response is successful.
 *
 */
function is(res)
{
	if (res === undefined || res.response === undefined || res.response.result === undefined || res.response.result !== 'success')
	{
		adapter.log.warn('API response invalid!');
		adapter.log.debug(JSON.stringify(res));
		return false;
	}
	else if (res.response.message === 'Invalid apikey')
	{
		adapter.log.warn('Invalid API key. No results retrieved!');
		return false;
	}
	
	else
		return true;
}

/**
 * Retrieve data from the Tautulli API.
 *
 * Available API methods:
 *	- add_newsletter_config
 *	- add_notifier_config
 *	- arnold
 *	- backup_config
 *	- backup_db
 *	- delete_all_library_history
 *	- delete_all_user_history
 *	- delete_cache
 *	- delete_hosted_images
 *	- delete_image_cache
 *	- delete_library
 *	- delete_login_log
 *	- delete_lookup_info
 *	- delete_media_info_cache
 *	- delete_mobile_device
 *	- delete_newsletter
 *	- delete_newsletter_log
 *	- delete_notification_log
 *	- delete_notifier
 *	- delete_temp_sessions
 *	- delete_user
 *	- docs
 *	- docs_md
 *	- download_config
 *	- download_database
 *	- download_log
 *	- download_plex_log
 *	- edit_library
 *	- edit_user
 *	- get_activity
 *	- get_apikey
 *	- get_date_formats						not required
 *	- get_geoip_lookup						not required
 *	- get_history
 *	- get_home_stats
 *	- get_libraries							IMPLEMENTED
 *	- get_libraries_table
 *	- get_library							same as -get_libraries-
 *	- get_library_media_info
 *	- get_library_names						reduced set of -get_libraries-
 *	- get_library_user_stats
 *	- get_library_watch_time_stats			IMPLEMENTED
 *	- get_logs
 *	- get_metadata
 *	- get_new_rating_keys
 *	- get_newsletter_config
 *	- get_newsletter_log
 *	- get_newsletters
 *	- get_notification_log
 *	- get_notifier_config
 *	- get_notifier_parameters
 *	- get_notifiers
 *	- get_old_rating_keys
 *	- get_plays_by_date
 *	- get_plays_by_dayofweek
 *	- get_plays_by_hourofday
 *	- get_plays_by_source_resolution
 *	- get_plays_by_stream_resolution
 *	- get_plays_by_stream_type
 *	- get_plays_by_top_10_platforms
 *	- get_plays_by_top_10_users
 *	- get_plays_per_month
 *	- get_plex_log
 *	- get_pms_token
 *	- get_pms_update
 *	- get_recently_added
 *	- get_server_friendly_name				not required
 *	- get_server_id
 *	- get_server_identity
 *	- get_server_list
 *	- get_server_pref
 *	- get_servers_info						IMPLEMENTED
 *	- get_settings
 *	- get_stream_data
 *	- get_stream_type_by_top_10_platforms
 *	- get_stream_type_by_top_10_users
 *	- get_synced_items
 *	- get_user								same as -get_users-
 *	- get_user_ips
 *	- get_user_logins
 *	- get_user_names						reduced set of -get_users-
 *	- get_user_player_stats
 *	- get_user_watch_time_stats				IMPLEMENTED
 *	- get_users								IMPLEMENTED
 *	- get_users_table
 *	- get_whois_lookup
 *	- import_database
 *	- install_geoip_db
 *	- notify
 *	- notify_newsletter
 *	- notify_recently_added
 *	- pms_image_proxy
 *	- refresh_libraries_list
 *	- refresh_users_list
 *	- register_device
 *	- restart
 *	- search
 *	- set_mobile_device_config
 *	- set_newsletter_config
 *	- set_notifier_config
 *	- sql
 *	- terminate_session
 *	- undelete_library
 *	- undelete_user
 *	- uninstall_geoip_db
 *	- update
 *	- update_chec
 *	- update_metadata_details
 *
 */
function retrieveData()
{
	var watched = {'01-last_24h': 'Watched last 24 hours', '02-last_7d': 'Watched last 7 days', '03-last_30d': 'Watched last month', '00-all_time': 'Watched all times'};
	adapter.log.info('Retrieving information from Tautulli..');
	
	//
	// https://github.com/Tautulli/Tautulli/blob/master/API.md#get_servers_info
	//
	library.set({node: 'servers', role: 'channel', description: 'Plex Server'}, '');
	tautulli.get('get_servers_info').then(function(res)
	{
		if (!is(res)) return; else data = res.response.data;
		
		data.forEach(function(entry)
		{
			var id = entry['name'].toLowerCase();
			for (var key in entry)
				library.set({node: 'servers.' + id + '.' + key}, entry[key]);
		});
	});
	
	//
	// https://github.com/Tautulli/Tautulli/blob/master/API.md#get_libraries
	//
	library.set({node: 'libraries', role: 'channel', description: 'Plex Libraries'}, '');
	tautulli.get('get_libraries').then(function(res)
	{
		if (!is(res)) return; else data = res.response.data;
		
		data.forEach(function(entry)
		{
			var libId = entry['section_id'] + '-' + entry['section_name'].toLowerCase();
			for (var key in entry)
				library.set({node: 'libraries.' + libId + '.' + key, role: 'text', description: key.replace(/_/gi, ' ')}, entry[key]);
			
			// https://github.com/Tautulli/Tautulli/blob/master/API.md#get_library_watch_time_stats
			library.set({node: 'libraries.' + libId + '.watched', role: 'channel', description: 'Library Watch Statistics'}, '');
			tautulli.get('get_library_watch_time_stats', {'section_id': entry['section_id']}).then(function(res)
			{
				if (!is(res)) return; else data = res.response.data;
				
				data.forEach(function(entry, i)
				{
					var id = Object.keys(watched)[i];
					library.set({node: 'libraries.' + libId + '.watched.' + id, role: 'channel', description: watched[id]}, '');
						
					for (var key in entry)
					{
						library.set({node: 'libraries.' + libId + '.watched.' + id + '.' + key, role: 'text', description: key.replace(/_/gi, ' ')}, entry[key]);
					}
				});
			});
		});
	});
	
	//
	// https://github.com/Tautulli/Tautulli/blob/master/API.md#get_users
	//
	library.set({node: 'users', role: 'channel', description: 'Plex Users'}, '');
	tautulli.get('get_users').then(function(res)
	{
		if (!is(res)) return; else data = res.response.data;
		
		data.forEach(function(entry)
		{
			var userId = entry['friendly_name'].toLowerCase().replace(/ /gi, '_');
			if (userId === 'local') return;
			
			library.set({node: 'users.' + userId, role: 'channel', description: 'User ' + entry['friendly_name']}, '');
			library.set({node: 'users.' + userId + '.data', role: 'channel', description: 'User Information'}, '');
			library.set({node: 'users.' + userId + '.watched', role: 'channel', description: 'User Watch Statistics'}, '');
			
			// fill user information
			for (var key in entry)
			{
				if (key === 'server_token') continue;
				library.set({node: 'users.' + userId + '.data.' + key, role: 'text', description: key.replace(/_/gi, ' ')}, entry[key]);
			}
			
			// https://github.com/Tautulli/Tautulli/blob/master/API.md#get_user_watch_time_stats
			tautulli.get('get_user_watch_time_stats', {'user_id': entry['user_id']}).then(function(res)
			{
				if (!is(res)) return; else data = res.response.data;
				
				data.forEach(function(entry, i)
				{
					var id = Object.keys(watched)[i];
					library.set({node: 'users.' + userId + '.watched.' + id, role: 'channel', description: watched[id]}, '');
						
					for (var key in entry)
					{
						library.set({node: 'users.' + userId + '.watched.' + id + '.' + key, role: 'text', description: key.replace(/_/gi, ' ')}, entry[key]);
					}
				});
			});
		});
	});
	
}

/*
 * COMPACT MODE
 * If started as allInOne/compact mode => return function to create instance
 *
 */
if (module && module.parent)
	module.exports = startAdapter;
else
	startAdapter(); // or start the instance directly
