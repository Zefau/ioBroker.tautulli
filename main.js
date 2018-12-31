'use strict';
const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
const adapter = utils.Adapter('tautulli');
const _http = require('http');

/*
 * internal libraries
 */
const Library = require(__dirname + '/lib/library.js');

/*
 * variables initiation
 */
var library = new Library(adapter);
var nodes = {
	
};

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

/*
 * ADAPTER READY
 *
 */
adapter.on('ready', function()
{
	// usage of ioBroker.cloud / ioBroker.iot, thus add listener
	if (adapter.config.iobroker !== undefined && adapter.config.iobroker !== '')
	{
		adapter.config.iot = adapter.config.iot !== '' ? adapter.config.iot : 'iot.0.services.custom_tautulli';
		adapter.getForeignState(adapter.config.iot, function(err, state)
		{
			// ioBroker.iot state not defined
			if (err !== null || state === null)
			{
				adapter.log.warn('ioBroker.iot link for custom service given, but ioBroker.iot custom state wrong or not created!');
				return;
			}
			
			// listen to ioBroker.iot state changes
			else
			{
				adapter.subscribeForeignStates(adapter.config.iot);
				adapter.log.info('Listening to ioBroker.iot link for custom service (' + adapter.config.iot + ').');
			}
		})
	}
	else
		adapter.log.info('ioBroker.iot link for custom service not defined. Thus, only listening on local network.');
	
	// listen to internal port
	_http.createServer(listener(getEvent)).listen(adapter.config.port || 1990);
});

/*
 * STATE CHANGE
 *
 */
adapter.on('stateChange', function(id, state)
{
	adapter.log.debug('State of ' + id + ' has changed ' + JSON.stringify(state) + '.');
	
	if (id === adapter.config.iot || id === 'iot.0.services.custom_tautulli')
	{
		try
		{
			var parsed = JSON.parse(state);
			
			if (parsed.val !== undefined)
				getEvent(JSON.parse(parsed.val));
			
			else
				adapter.log.warn('Invalid message received from Tautulli webhook!');
		}
		catch(e)
		{
			adapter.log.warn('Invalid data received from Tautulli webhook!');
			//adapter.log.debug(JSON.stringify(state));
		}
	}
});

/**
 * Listen to data on the webhook.
 *
 *
 */
function listener(callback)
{
	adapter.log.debug('Webhook listener attached.');
	return function(request, response)
	{
		var data = [];
		request
			.on('error', function(err) {callback({result: false, error: err})})
			.on('data', function(chunk) {data.push(chunk)})
			.on('end', function()
			{
				var result = null;
				try
				{
					data = JSON.parse(Buffer.concat(data).toString());
					data.timestamp = Math.round(Date.now()/1000);
					result = {result: true, data: data};
				}
				catch(err)
				{
					result = {result: false, error: err.message};
				}
				
				callback(result);
			});
	}
}

/**
 * Handle to event data.
 *
 * @param	{object}	res
 * @param	{string}	res.title		Title of event
 * @param	{string}	res.message		Message of event
 * @param	{intetger}	res.timestamp	Timestamp of event
 * @return	void
 *
 */
function getEvent(res)
{
	adapter.log.info('Received an event from Tautulli.');
	adapter.log.debug(JSON.stringify(res));
}