//////////////////////////////////////////////////////////////////////////////////////////
// TAGGER										//
// Author: Mike Cook								     	//
// Date: 06/11/12									//
// Description: A plugin to allow tag creation and viewing with a depth-of-field effect	//
//////////////////////////////////////////////////////////////////////////////////////////
var Tagger = {
	// Example Tag
	example: {
		// Shortcut to the cover photo */
		imageUrl: "/images/tagger_example.png",
		// Shortcut to prior image size (needed to scale with background-size
		imageDimensions: { width: 505, height: 340 },
		// Array of pictures
		snaps: [{
			url: "/images/tagger_example.png",
			imageDimensions: { width: 505, height: 340 },
		}],
		// Array of tags
		tags: []
	},
	
	//////////////////////////////////////////////////////////////////////////////////////
	// TAGGER PROPERTIES																//
	//////////////////////////////////////////////////////////////////////////////////////
	
	// The element containing the tagger
	container: null,
	
	// Flag controlling whether the tagger can enter a draw state
	allowDraw: null,
	
	// Flag for whether we are currently drawing
	drawing: null,
	
	// The dimension of the containing element (used for scaling)
	containerDimensions: null,
	
	// The element to place tag thumbnails into
	thumbnailContainer: null,
	
	// The current image we are manipulating
	image: null,
	
	// The layers the tagger uses to create the effect
	blurLayer: null,
	imageLayer: null,
	drawLayer: null,
	
	// Storage for keeping track of current and start cursor locations
	originalLocation: null,

	//////////////////////////////////////////////////////////////////////////////////////
	// TAGGER SETUP																		//
	//////////////////////////////////////////////////////////////////////////////////////

	//// Initialization
	// p_element: The element is automatically passed for some strange reason
	// p_thumbnail_container: Container element to place thumbnails
	// p_allow_draw: Flag for whether the tagger should is in edit mode
	// p_image_data (Optional): The data for the image
	init: function(p_element, p_thumbnail_container, p_allow_draw, p_image_data) {
		// Get a reference to the container element
		Tagger.container = p_element;
		
		// Bind the events
		Tagger.bindEvents();
		
		// Set the flag for whether we are in edit mode or read-only mode
		Tagger.allowDraw = p_allow_draw || false;
	
		// Get the base dimensions
		Tagger.containerDimensions = { width: $(Tagger.container).width(), height: $(Tagger.container).height() };
		
		// Get a reference to the thumbnail container
		Tagger.thumbnailContainer = p_thumbnail_container;
		
		// Get a reference to the tag form
		Tagger.tagForm = $(".plugin_tagger_tag_form")[0];
		
		// Load the Outfit (binding this to maintain reference)
		Tagger.renderTagger(Tagger.example);
	},
	
	//// Bind events for the tagger
	bindEvents: function() {
		// Bind the mousedown event for the draw layer
		$(".plugin_tagger_draw").mousedown(Tagger.drawMousedown);
		
		// Bind the mousemove event for the draw layer
		$(".plugin_tagger_draw").mousemove(Tagger.drawMousemove);
		
		// Bind the mouse move event for the draw layer's rectangle
		$(".plugin_tagger_rectangle").mousemove(Tagger.rectangleMousemove);
		
		// Bind the mouse up event for the draw layer
		$(".plugin_tagger_draw").mouseup(Tagger.drawMouseup);
		
		// Bind the mouse up event for the draw layer's rectangle
		$(".plugin_tagger_rectangle").mouseup(Tagger.rectangleMouseup);
	},
	
	//// Initialized the various tagger elements
	// p_image: Image to render with
	renderTagger: function(p_image) {
		// Set the local image
		Tagger.image = p_image;
		
		// Recalculate the images height 
		Tagger.recalculateHeight(p_image.snaps[0]);
		
		// Define the tagger layers
		Tagger.blurLayer = {};
		Tagger.imageLayer = {};
		Tagger.drawLayer = {};
		
		// Setup the layers
		Tagger.setupLayers();
		
		// Setup the basic image
		Tagger.setupImage(p_image.snaps[0]);
		
		// Setup the displacement effect
		Tagger.setupDisplacement(p_image.snaps[0]);
		
		// Setup the tag images
		Tagger.setupTagImages(p_image.snaps[0]);
	},
	
	//// Recalculate the height of the container by the height of the scaled image
	// p_snap: The snap object to recalculate with
	recalculateHeight: function(p_snap) {
		// Calculate the estimated vertical size of the image after the scaling
		var scaled_height = parseInt((Tagger.containerDimensions.width / p_snap.imageDimensions.width) * p_snap.imageDimensions.height);
									 
		// Update the container dimensions property
		Tagger.containerDimensions.height = scaled_height;
							
		// Set the height of the element and tagger base to match the scaled height of the image
		$(Tagger.container).css("height", scaled_height + 'px');	
		$(Tagger.container).find(".plugin_tagger_base").css("height", scaled_height + 'px');
	},
	
	//// Setup the layers
	setupLayers: function() {
		// Setup the blur layer
		Tagger.blurLayer.elements = $(Tagger.container).find(".plugin_tagger_displace");

		// Setup the image layer and image
		Tagger.imageLayer = $(Tagger.container).find(".plugin_tagger_image")[0];
		
		// Setup the draw layer and rectangle
		Tagger.drawLayer = $(Tagger.container).find(".plugin_tagger_draw")[0];
		Tagger.drawLayer.rectangle = $(Tagger.drawLayer).children(".plugin_tagger_rectangle")[0];
		
		// Set the draw layer dimensions
		$(Tagger.drawLayer).css({
			width: Tagger.containerDimensions.width + 'px',
			height: Tagger.containerDimensions.height + 'px'
		});
		
		// Set the default drawing state
		Tagger.drawLayer.drawing = false;
	},
	
	//// Setup the base image
	// p_snap: The snap to setup the image with
	setupImage: function(p_snap) {
		// Set the image layer background and dimensions
		$(Tagger.imageLayer).css({
			backgroundImage: "url('" + p_snap.url + "')",
			width: Tagger.containerDimensions.width + 'px',
			height: Tagger.containerDimensions.height + 'px'
		});
		
		// Set the image layer background size
		$(Tagger.imageLayer).setBackgroundSize(Tagger.containerDimensions.width);
		
		// Add the crosshair class to the draw layer and rectangle if we are allowing drawing
		if (Tagger.allowDraw) {
			$(Tagger.drawLayer).addClass("tagger_crosshair");
			$(Tagger.drawLayer.rectangle).addClass("tagger_crosshair");
		}
		
		// Set the draw layer rectangle background and dimensions
		$(Tagger.drawLayer.rectangle).css({
			backgroundImage: "url(" + p_snap.url + ")",
		});
		
		// Add a border dimensions property for use in positioning the background
		Tagger.drawLayer.rectangle.borderDimensions = {
			leftWidth: parseInt($(Tagger.drawLayer.rectangle).css("border-left-width").replace("px", "")),
			topWidth: parseInt($(Tagger.drawLayer.rectangle).css("border-top-width").replace("px", ""))
		};
		
		// Set the rectangle background size
		$(Tagger.drawLayer.rectangle).setBackgroundSize(Tagger.containerDimensions.width);
	},
	
	//// Setup the displaced images for the blur effect
	// p_snap: The snap to use 
	setupDisplacement: function(p_snap) {
		// Set the initial offset
		var offset = { x: 1, y: 1 };
		
		// Loop through the blur layer images
		for (var i = 0; i < Tagger.blurLayer.elements.length; i++) {
			// Shorthand the element
			var displace = Tagger.blurLayer.elements[i];
		
			// Set the element CSS values
			$(displace).css({
				backgroundImage: "url(" + p_snap.url + ")",
				backgroundPosition: offset.x + "px " + offset.y + "px",
				width: Tagger.containerDimensions.width + 'px',
				height: Tagger.containerDimensions.height + 'px',
				top: Tagger.verticalOffset + 'px'
			});
			
			// Set the background size
			$(displace).setBackgroundSize(Tagger.containerDimensions.width);
			
			// Set the next offset
			offset.x = (i + 1) % 2 === 0 ? offset.x * -1 : offset.x;
			offset.y = (i + 1) % 2 === 1 ? offset.y * -1 : offset.y;
		}
	},
	
	//// Setup the thumbnail images for tags
	setupTagImages: function() {
		// Clear out any existing tag images
		$(Tagger.thumbnailContainer).children().remove();
		
		// Check that we have a tags array
		Tagger.image.tags = typeof Tagger.image.tags === "undefined" ? [] : Tagger.image.tags;
	
		// Loop through the snap tags
		for (var i = 0; i < Tagger.image.tags.length; i++) {
			// Shorthand the item
			var tag = Tagger.image.tags[i];
		
			// Create a new thumbnail and set the ID
			var thumbnail = document.createElement("span");
			thumbnail.id = tag.id;
	
			// Set the class name, including the margin on every 3rd element
			thumbnail.className = ((i + 1) % 3 === 0) ? "plugin_tagger_item_last plugin_tagger_item"
								  : "plugin_tagger_item";

			// Add the thumbnail to the document
			$(Tagger.thumbnailContainer).append(thumbnail);
			
			// Scale the image correctly
			Tagger.scaleToFit(thumbnail, {
				x: tag.x,
				y: tag.y,
				width: tag.width,
				height: tag.height
			});
			
			// Bind the thumbnail mouse events
			Tagger.bindTagEvents(thumbnail);
		}
	},
	
	//// Bind mouse events for a tag
	// p_thumbnail: The tag thumbnail element to bind the events to
	bindTagEvents: function(p_thumbnail) {
		// Bind the mouse over and mouse out events
		$(p_thumbnail).mouseover(Tagger.tagItemMouseover);
		$(p_thumbnail).mouseout(Tagger.tagItemMouseout);
	},
	
	//////////////////////////////////////////////////////////////////////////////////////
	// TAGGER DRAWING EVENTS															//
	//////////////////////////////////////////////////////////////////////////////////////
	
	//// Preps the draw layer to begin drawing
	// p_event: The mouse cursor event
	beginDraw: function(p_event) {
		// Prevent the default
		p_event.preventDefault();
		
		// Check if we are allowing drawing
		if (!Tagger.allowDraw) {
			// We are not allowing new tags, so exit
			return false;
		}
	
		// Get the cursor position relative to the draw layer
		Tagger.drawLayer.originalLocation = Tagger.relativeCursor(p_event, Tagger.drawLayer);
		
		// Flag that we are going to begin drawing
		Tagger.drawLayer.drawing = true;
		
		// Blur the image
		$(Tagger.imageLayer).css("visibility", "hidden");
		
		// Display the rectangle
		$(Tagger.drawLayer.rectangle).css("display", "block");
		
		// Hide any open tag form
		$(Tagger.tagForm).css("display", "none");
	},
	
	//// Processes updates during the drawing process
	// p_event: The mouse cursor event
	updateDraw: function(p_event) {
		// Verify we are drawing
		if (!Tagger.drawLayer.drawing) {
			// Exit, since we are not drawing
			return false;
		}
		
		// Get the current location
		var current_location = Tagger.relativeCursor(p_event, Tagger.drawLayer);  
		
		// Correct the max and min x values
		current_location.x = current_location.x < 0 ? 0 : current_location.x;
		current_location.x = current_location.x > Tagger.containerDimensions.x ? 
							 Tagger.containerDimensions.x : 
							 current_location.x;
		
		// Correct the max and min y values
		current_location.y = current_location.y < 0 ? 0 : current_location.y;
		current_location.y = current_location.y > Tagger.containerDimensions.y ? 
							 Tagger.containerDimensions.y : 
							 current_location.y;
		
		// Set the rectangle width and height
		$(Tagger.drawLayer.rectangle).css("width", Math.abs(current_location.x - Tagger.drawLayer.originalLocation.x) + 'px');
		$(Tagger.drawLayer.rectangle).css("height", Math.abs(current_location.y - Tagger.drawLayer.originalLocation.y) + 'px');
		
		// Calculate the left position
		var left = current_location.x < Tagger.drawLayer.originalLocation.x ?
				   Tagger.drawLayer.originalLocation.x - $(Tagger.drawLayer.rectangle).width() :
				   Tagger.drawLayer.originalLocation.x;
				   
		// Calculate the top position
		var top = current_location.y < Tagger.drawLayer.originalLocation.y ?
				  Tagger.drawLayer.originalLocation.y - $(Tagger.drawLayer.rectangle).height() :
				  Tagger.drawLayer.originalLocation.y;
		
		// Set the left and top css properties
		$(Tagger.drawLayer.rectangle).css({ left: left + 'px', top: top + 'px' });
		
		// Update the background position
		$(Tagger.drawLayer.rectangle).css("background-position", "-" + ($(Tagger.drawLayer.rectangle).position().left + 
																	  Tagger.drawLayer.rectangle.borderDimensions.leftWidth) + 'px ' + 
															   "-" + ($(Tagger.drawLayer.rectangle).position().top + 
																	  Tagger.drawLayer.rectangle.borderDimensions.topWidth) + 'px');
	},
	
	//// Finalizes the draw action
	// p_event: The mouse cursor event
	finishDraw: function(p_event) {
		// Check if we are drawing
		if (!Tagger.drawLayer.drawing) {
			// Not drawing, so just exit
			return false;
		}
	
		// Clear the initial location
		Tagger.drawLayer.originalLocation = { x: 0, y: 0 };
		
		// Flag that we are done animating
		Tagger.drawLayer.drawing = false;
		
		// Check if we have a box visible and that it is at least 20 ^ 2 pixels
		if ($(Tagger.drawLayer.rectangle).css("display") === "none" ||
			($(Tagger.drawLayer.rectangle).width() < 20 && $(Tagger.rectangle).height() < 20)) {
			// The box is too small, so just exit drawing
			Tagger.exitDraw();
		} else {
			// The box is the minimum size, so add the tag
			Tagger.addTag();
			
			// Exit drawing
			Tagger.exitDraw();
		}
	},
	
	//// Reverts the tagger to the normal state
	exitDraw: function() {	
		// Hide the rectangle
		$(Tagger.drawLayer.rectangle).css("display", "none");
		
		// Show the unblurred image
		$(Tagger.imageLayer).css("visibility", "visible");
	},
	
	//// Create and add a tag from the selected box
	addTag: function() {
		// Add the tag
		Tagger.image.tags.push({
			title: "",
			id: Tagger.image.tags.length,
			x: parseInt($(Tagger.drawLayer.rectangle).position().left),
			y: parseInt($(Tagger.drawLayer.rectangle).position().top),
			width: $(Tagger.drawLayer.rectangle).width(),
			height: $(Tagger.drawLayer.rectangle).height()
		});
		
		// Refresh the tag window
		Tagger.setupTagImages();
	},
	
	//////////////////////////////////////////////////////////////////////////////////////
	// TAGGER DOM EVENTS																//
	//////////////////////////////////////////////////////////////////////////////////////
	
	//// Mousedown event for the draw layer
	// p_element: The element affected
	// p_event: The cursor event
	drawMousedown: function(p_event) {
		// Setup the layer for drawing
		Tagger.beginDraw(p_event);
	},
	
	//// Mouse move event for the draw layer
	// p_element: The element affected
	// p_event: The cursor event
	drawMousemove: function(p_event) {
		// Update the rectangle (or nothing if not drawing)
		Tagger.updateDraw(p_event);
	},
	
	//// Mouse move event for the draw layer rectangle
	// p_element: The element affected
	// p_event: The cursor event
	rectangleMousemove: function(p_event) {
		// Update the rectangle (or nothing if not drawing)
		Tagger.updateDraw(p_event);
	},
	
	//// Mouseup event for the draw layer
	// p_element: The element affected
	// p_event: The cursor event
	drawMouseup: function(p_event) {
		// Setup the layer for drawing
		Tagger.finishDraw(p_event);
	},
	
	//// Mouseup event for the draw layer rectangle
	// p_element: The element affected
	// p_event: The cursor event
	rectangleMouseup: function(p_event) {
		// Setup the layer for drawing
		Tagger.finishDraw(p_event);
	},
	
	//////////////////////////////////////////////////////////////////////////////////////
	// TAGGER THUMBNAIL DOM EVENTS														//
	//////////////////////////////////////////////////////////////////////////////////////
	
	//// Mouseover event for the thumbnail item
	// p_element: The element affected
	tagItemMouseover: function() {		
		// Get the tag id
		var tag_id = this.id;
		
		// Get the tag information
		var tag = Tagger.image.tags[tag_id];

		// Set the rectangle properties
		$(Tagger.drawLayer.rectangle).css({
			top: tag.y + 'px',
			left: tag.x + 'px',
			width: tag.width + 'px',
			height: tag.height + 'px',
			backgroundPosition: "-" + (parseInt(tag.x) + Tagger.drawLayer.rectangle.borderDimensions.leftWidth) + 'px ' + 
								"-" + (parseInt(tag.y) + Tagger.drawLayer.rectangle.borderDimensions.topWidth) + 'px',
			display: "block"
		});
		
		// Hide the image
		$(Tagger.imageLayer).css("opacity", "0.0");
	},
	
	//// Mouseout event for the thumbnail item
	// p_element: The element affected
	tagItemMouseout: function(p_element) {
		// Get the tag id
		var tag_id = this.id;
		
		// Get the tag information
		var tag = Tagger.image.tags[tag_id];
		
		// Set the rectangle properties
		$(Tagger.drawLayer.rectangle).css({
			top: '0px',
			left: '0px',
			width: '0px',
			height: '0px',
			display: "none"
		});
		
		// Show the image
		$(Tagger.imageLayer).css("opacity", "1.0");
	},
	
	//////////////////////////////////////////////////////////////////////////////////////
	// TAGGER UTILITY FUNCTIONS															//
	//////////////////////////////////////////////////////////////////////////////////////
	
	//// Gets a cursor's x, y offset relative to an element
	// p_event: Cursor event information
	// p_relative: Element to make the position relative to
	relativeCursor: function(p_event, p_relative) {
		// Set the inital cursor point
		var point = {
			x: p_event.pageX - $(p_relative).offset().left,
			y: p_event.pageY - $(p_relative).offset().top
		};
		
		// Return the point
		return point;
	},
	
	//// Calculate the necessary vertical offset for an image
	// p_dimensions: The image dimensions
	calculateOffset: function(p_dimensions) {
		// Get the reduction percentage
		var reduction = Tagger.containerDimensions.width / p_dimensions.width;
		
		// Calculate what the new height of the image will be
		var new_height = parseInt(p_dimensions.height * reduction);
		
		// Get the vertical offset needed to set this in the vertical center
		var offset = (Tagger.containerDimensions.height - new_height) / 2;
		
		// Return the offset, or zero in the case of a negative offset
		return offset > 0 ? parseInt(offset) : 0;
	},
	
	//// Scale a subselection to fit an element
	// p_container: The container for the subselection
	// p_selection: Object containing selection info
	//		- x: The left coordinate position
	//		- y: The top coordinate position
	// 		- width: The width of the selection
	//		- height: The height of the selection
	scaleToFit: function(p_container, p_selection) {
		// Get the thumbnail width and height
		var thumbnail_width = $(p_container).width();
		var thumbnail_height = $(p_container).height();
		
		// Check if we are scaling by height or width
		var scale_by_width = p_selection.width > p_selection.height ? false : true;
		
		// Calculate the reduction to fit the thumbnail (depending on whether we are scaling by width or height)
		var reduction =  scale_by_width ? thumbnail_width / p_selection.width
				                : thumbnail_height / p_selection.height;
		
		// Determine the new width
		var new_width = Tagger.containerDimensions.width * reduction;
		
		// Convert to an int and check for a negative value
		var new_width = new_width > 0 ? parseInt(new_width) : 0;
		
		// Calculate the new background position, centering on the scaled selection
		var background_position = {
			x: (p_selection.x * reduction) + ((p_selection.width * reduction) > thumbnail_width ? 
			   ((p_selection.width * reduction) - thumbnail_width) / 2 :
			   0),
			y: (p_selection.y * reduction) + ((p_selection.height * reduction) > thumbnail_height ? 
			   ((p_selection.height * reduction) - thumbnail_height) / 2 :
			   0)							 
		};
		
		// Set the background size
		$(p_container).setBackgroundSize(new_width);		
		
		// Set the background css properties
		$(p_container).css({ 
			backgroundImage: "url(" + this.image.snaps[0].url + ")",
			backgroundPosition: "-" + parseInt(background_position.x) + "px " +
								parseInt(-(background_position.y)) + "px"
		});
	}
};

// OnReady Function
$(document).ready(function() {
	// Init the tagger on a fixed element
	Tagger.init($("#tagger_widget")[0], $("#tagger_tags")[0], true);
});
