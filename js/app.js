"use strict";

// --------- MODEL ---------
// all the data used to place the markers
var places = [
	{
		name: 'Berghain Club',
		lat: 52.511773,
		lng: 13.443126,
		label : 'Berghain',
		tags: ['Berghain'],
	},
	{
		name: 'Pergamonmuseum',
		lat: 52.522558,
		lng: 13.396349,
		label : 'Pergamon Museum',
		tags: ['Pergamonmuseum'],
	},
	{
		name: 'Alexanderplatz',
		lat: 52.522506,
		lng: 13.410940,
		label : 'Alexanderplatz',
		tags: ['Alexanderplatz']
	},
	{
		name: 'Mustafas Gemüse Döner',
		lat: 52.510291,
		lng: 13.451059,
		label : 'Doner kebab',
		tags: ['Döner '],
	},
	{
		name: 'Zoo Berlin',
		lat: 52.509474,
		lng: 13.337794,
		label : 'Berlin Zoological Garden',
		tags: ['Zoo Berlin'],
	}
];

// --------- GOOGLE MAPS --------

var googleMap = {
	map: {},
	infoWindow: new google.maps.InfoWindow(), // reusable info window
	options: {
		center: { lat: 52.522650, lng: 13.413215},
		zoom: 13,
		mapTypeId: google.maps.MapTypeId.HYBRID
	},
	infoWindowContent: '<div class="info-window"><div class="window-title">%title%</div><div>%link%</div></div>' ,
	init: function(vm) {
		googleMap.map = new google.maps.Map(document.getElementById('map'), googleMap.options);
		// show markers in time with the map loaded
		if (vm.initialized && !vm.hasMarkers) vm.showMarkers();
	}
};

//---------- PLACE OBJECT --------

var Place = function(data, viewmodel
	) {
	var self = this;
	this.name = ko.observable(data.name);
	this.tags = ko.observableArray(data.tags);
	this.lat = ko.observable(data.lat);
	this.lng = ko.observable(data.lng);
	this.label= data.label;

	// google maps marker
	var marker = new google.maps.Marker({
		position: new google.maps.LatLng(data.lat, data.lng),
	});

	// click handler the markers
	google.maps.event.addListener(marker, 'click', function() {
			viewmodel.showPlace(self);
		});
	google.maps.Animation.DROP;
	this.marker = marker;
};

// --------- FILTER OBJECT -------

var Filter = function(data) {
	this.name = ko.observable(data.name);
	this.on = ko.observable(true);
};


//-------- VIEW MODEL ----------

var ViewModel = function() {
	var self = this;
	self.searchFilter = ko.observable('');
	self.currentPlace = ko.observable();
	self.hasMarkers = false;
	self.initialized = false;
	self.connectionError = ko.observable(false);

	// --------- INIT ---------

	self.init = function() {
		var tempTagArr = [];
		var tempFilterArr = [];

		// create container for places
		self.placeList = ko.observableArray([]);

		// loop through places array and convert to ko object
		places.forEach(function(place) {
			self.placeList.push(new Place(place, self));

			// loop through tags for each place and add to self.filters
			place.tags.forEach(function(tag){
				// if current tag is not already a filter, add to self.filters
				if (tempTagArr.indexOf(tag) < 0) {
					tempTagArr.push(tag);
				}
			});// end tag loop
		});// end place loop

		// loop through tags and make filter objects from them
		tempTagArr.forEach(function(tag){
			tempFilterArr.push(new Filter({name: tag}));
		});

		// set filters based on temporary array
		// this has performance benefits over pushing items one at a time
		self.filters = ko.observableArray(tempFilterArr);

		// array of filters currently applied
		self.currentFilters = ko.computed(function() {
			var tempCurrentFilters = [];

			// loop through filters and get all filters that are on
			ko.utils.arrayForEach(self.filters(), function(filter){
				if (filter.on()) tempCurrentFilters.push(filter.name());
			});

			return tempCurrentFilters;
		});

		// array of places to be shown based on currentFilters
		self.filteredPlaces = ko.computed(function() {
			var tempPlaces = ko.observableArray([]);
			var returnPlaces = ko.observableArray([]);

			// apply filter
			ko.utils.arrayForEach(self.placeList(), function(place){
				var placeTags = place.tags();

				// loop through all tags for a place and
				// determine if any are also a currently applied filter
				var intersections = placeTags.filter(function(tag){
					return self.currentFilters().indexOf(tag) != -1;
				});

				// if one or more tags for a place are in a filter, add it
				if (intersections.length > 0) tempPlaces.push(place);
			});

			var tempSearchFilter = self.searchFilter().toLowerCase();

			// if there is no additional text to search for, return filtered places
			if (!tempSearchFilter){
				returnPlaces = tempPlaces();
			}
			// if user is also searching via text box, apply text filter
			else{
				returnPlaces = ko.utils.arrayFilter(tempPlaces(), function(place) {
		        	return place.name().toLowerCase().indexOf(tempSearchFilter) !== -1;
		        });
			}

			// hide/show correct markers based on list of current places
			self.filterMarkers(returnPlaces);
			return returnPlaces;

		});
		// if no markers have been shown, show them
		if (!self.hasMarkers) self.showMarkers();
		self.initialized = true;
	};

	//---------- FUNCTIONS --------
	var findFirstImage = function(images){
			var result = $(images).filter(function(index, element){
				return element.toLowerCase().match(/\.(png|jpg|jpeg|gif)$/);
			}).first();
			return result.length > 0 ? result[0] : null;
		}
		var getFirstImage = function(title, callback) {
	        $.ajax({
	        	type: "GET",
	        	url: "https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=images&section=0&page="+title+"&callback=?",
	        	contentType: "application/json; charset=utf-8",
	            dataType: "json",
	            success: function (data, textStatus, jqXHR) {
	                var image = findFirstImage(data.parse.images);
	                if (image){
	                	callback(image);
	                }


	            },
	            error: function(){
	            	wikiLink = '<p>Failed to get wikipedia ressources.</p>';
		    		googleMap.infoWindow.setContent(googleMap.infoWindowContent.replace('%title%', place.name()).replace('%link%', wikiLink));
		    		googleMap.infoWindow.open(googleMap.map, place.marker);
	            }
	        });
	    };

        var getImageUrl = function(name, callback) {
	        $.ajax({
	            type: "GET",
	            url: "https://en.wikipedia.org/w/api.php?action=query&format=json&titles=Image:"+name+"&prop=imageinfo&iiprop=url&iiurlwidth=512&callback=?",
	            contentType: "application/json; charset=utf-8",
	            dataType: "json",
	            success: function (data, textStatus, jqXHR) {
	                var url = data.query.pages["-1"].imageinfo[0].thumburl;
	                callback(url);
	            },
	            error: function(){
	            	wikiLink = '<p>Failed to get wikipedia ressources.</p>';
		    		googleMap.infoWindow.setContent(googleMap.infoWindowContent.replace('%title%', place.name()).replace('%link%', wikiLink));
		    		googleMap.infoWindow.open(googleMap.map, place.marker);
	            }
	        });
	    };

	// shows/hides correct map markers
	self.filterMarkers = function(filteredPlaces) {
		ko.utils.arrayForEach(self.placeList(), function(place){
			if (filteredPlaces.indexOf(place) === -1) {
				place.marker.setVisible(false);
			}
			else{
				place.marker.setVisible(true);
			}
		});
	};

	// turns filter on or off
	// called when filter is clicked in view
	self.toggleFilter = function(filter) {
		filter.on(!filter.on());
	};

	// show the currently selected place
	// called when list item or map marker is clicked
	self.showPlace = function(place) {
		// set info window content and show it

		var wikiLink;


        getFirstImage(place.label, function(name) {
	        getImageUrl(name, function(url) {
	            wikiLink = "<image class = 'info-image'src=\"" + url + "\"/>"
	            googleMap.infoWindow.setContent(googleMap.infoWindowContent.replace('%title%', place.name()).replace('%link%', wikiLink));
		    	googleMap.infoWindow.open(googleMap.map, place.marker);
	            })
	        });

		// makes new marker Bounce when selected
		place.marker.setAnimation(google.maps.Animation.BOUNCE);

		setTimeout(function(){
			place.marker.setAnimation(null);
		}, 2100);

		// reset error status
		self.connectionError(false);
	};

	// show marker for each place
	self.showMarkers = function() {
		ko.utils.arrayForEach(self.placeList(), function(place){
			place.marker.setMap(googleMap.map);
		});

		self.hasMarkers = true;
	};
};


//---------- SETUP ----------

// empty view model
var vm = new ViewModel();

// listener for view model initialization
$( document ).ready(function() {
	vm.init();
	ko.applyBindings(vm);

	// resize map and reset center when window size changes
	$(window).on('resize', function() {
		google.maps.event.trigger(googleMap.map, 'resize');
		googleMap.map.setCenter(googleMap.options.center);
	});
});
// listener for google map initialization
google.maps.event.addDomListener(window, 'load', googleMap.init(vm));
