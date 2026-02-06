function reloadSelectOptions(elementId, endpoint, data, labelMapping, valueMapping) {
	var select = $("#" + elementId);

	$.ajax({
		type: "GET",
		url: endpoint,
		data: data,
		dataType: "json",
		timeout: 5000, // in milliseconds
		beforeSend: function() {
			select.empty();
			select.append('<option value="" selected>Loading...</option>');
			select.attr("disabled", "disabled");
			idtplans.dialog.loading();
		},
		success: function(response) {
			if(response.SUCCESS) {
				select.empty();
				serializedResponseData = idtplans.util.formatJSON(response).DATA;
				if (serializedResponseData.length > 0) {
					for (i=0; i < serializedResponseData.length; i++) {
						select.append('<option value="' + serializedResponseData[i][valueMapping] + '">' + serializedResponseData[i][labelMapping] + '</option>');
					}
				}
				select.removeAttr("disabled");
			}
			else {
				alert(response.MESSAGE[0]);
			}
		},
		error: function(request, status, err) {
			select.empty();
			if (status == "timeout") {
				alert('The request timed out, please try again.');
			}
			else{
				alert('an unknown error occurred.');
			}
		},
		complete: function() {
			select.prepend('<option value="0">Add New</option>');
			select.prepend('<option value="" selected>Select</option>');
			select.val('');
			idtplans.dialog.loading(false);
		}
	});
}

function initCategory(userAction) {
	var commentCategoryId = $('#commentCategoryId').val();
	if (userAction === 'edit' || userAction === 'reply' || userAction === 'close') {
		$('#dCommentText').show();
	}
	if (commentCategoryId && commentCategoryId.length && commentCategoryId != '0') {
		initTopics(true);
	}
}

function categoryHandler() {
	var commentCategoryId = $('#commentCategoryId').val();
	if (commentCategoryId == '0') {
		// we're entering a new category
		$('#dCommentCategory').slideDown('fast');
		initTopics(false);
	} else if (commentCategoryId && commentCategoryId.length && commentCategoryId != '0'){
		// a valid category is selected
		$('#dCommentCategory').slideUp('fast');
		// save this value to a cookie so that we can prepopulate
		setCookie("commentCategoryId", commentCategoryId, 30);
		initTopics(true);
	} else {
		// no option selected
		$('#dCommentCategory').slideUp('fast');
		initTopics(false);
	}
}

function initTopics(reloadOptions) {
	var commentCategoryId = $('#commentCategoryId').val();

	if (reloadOptions) {
		//refresh select options
		reloadSelectOptions('commentTopicId', '/secure/cfc/projectIssues.cfc', {method: "getTopics", commentCategoryId: commentCategoryId}, "commenttopic", "commenttopicid");
	}

	if (commentCategoryId == '0') {
		// entering a new category
		$('#dCommentTopicId').slideUp('fast');
		$('#dCommentTopic').slideDown('fast');
		$('#commentTopicId').val('0');
		initComments(false);
	} else if (commentCategoryId.length && commentCategoryId != '0'){
		//selected an existing category
		$('#dCommentTopicId').slideDown('fast');
		$('#dCommentTopic').slideUp('fast');
		initComments(false);
	} else {
		//no category selected
		$('#dCommentTopicId').slideUp('fast');
		$('#dCommentTopic').slideUp('fast');
		$('#commentTopicId').val('');
		initComments(false);
	}
}

function topicHandler() {
	var commentTopicId = $('#commentTopicId').val();
	if (commentTopicId == '0') {
		// we're entering a new topic
		$('#dCommentTopic').slideDown('fast');
		initComments(false);
	} else if (commentTopicId.length && commentTopicId != '0'){
		// a valid category is selected
		$('#dCommentTopic').slideUp('fast');
		initComments(true);
	} else {
		// no option selected
		$('#dCommentTopic').slideUp('fast');
		initComments(false);
	}
}

function initComments(reloadOptions) {
	var commentTopicId = $('#commentTopicId').val();

	if (reloadOptions) {
		//refresh select options
		reloadSelectOptions('commentTextId', '/secure/cfc/projectIssues.cfc', {method: "getComments", commentTopicId: commentTopicId}, "commenttitle", "commenttextid");
	}
	if (commentTopicId == '0') {
		//creating a new topic
		$('#dCommentTextId').slideUp('fast');
		$('#commentTextId').val('0');
		initComment(false);
	} else if (commentTopicId.length && commentTopicId != 0){
		//existing topic selected
		$('#commentTextId').val('');
		$('#dCommentTextId').slideDown('fast');
		initComment(false);
	} else {
		// no topic selected
		$('#commentTextId').val('');
		$('#dCommentTextId').slideUp('fast');
		initComment(false);
	}
}

function saveCommentHandler() {
	var saveComment = document.getElementById('saveComment').checked;
	if ( saveComment ) {
		$('#dCommentTitle').slideDown('fast');
	} else {
		$('#dCommentTitle').slideUp('fast');
	}
}

function initComment() {
	var commentTextId = $('#commentTextId').val();

	if (commentTextId == '0') {
		//creating a new comment
		$('#dSaveComment').slideDown('fast');
		$('#dCommentText').slideDown('fast');
		$('#dFileInput').slideDown('fast');
	} else if (commentTextId.length && commentTextId != '0'){
		//existing comment selected
		document.getElementById("saveComment").checked = false;
		$('#dSaveComment').hide();
		$('#dCommentText').slideDown('fast');
		$('#dFileInput').slideDown('fast');
	} else {
		// no comment selected
		document.getElementById("saveComment").checked = false;
		$('#dSaveComment').hide();
		$('#dCommentText').hide();
		$('#dFileInput').hide();
	}
	saveCommentHandler();
}

function commentHandler() {
	//console.log('commentHandler');
	var commentTextId = $('#commentTextId').val();

	if (commentTextId.length && commentTextId != '0') {
		$.ajax({
		type: "GET",
		url: '/secure/cfc/projectIssues.cfc',
		data: {method: "getComment", commentTextId: commentTextId},
		dataType: "json",
		timeout: 5000, // in milliseconds
		beforeSend: function() {
			idtplans.dialog.loading();
		},
		success: function(response) {
			if(response.SUCCESS) {
				serializedResponseData = idtplans.util.formatJSON(response).DATA;
				if (serializedResponseData.length > 0) {
					CKEDITOR.instances['commentText'].setData(serializedResponseData[0].commenttext);
				} else {
					CKEDITOR.instances['commentText'].setData('');
				}
			}
			else {
				alert(response.MESSAGE[0]);
			}
		},
		error: function(request, status, err) {
			if (status == "timeout") {
				alert('The request timed out, please try again.');
			}
			else{
				alert('an unknown error occurred.');
			}
		},
		complete: function() {
			idtplans.dialog.loading(false);
			initComment();
		}
	});
	} else {
		CKEDITOR.instances['commentText'].setData('');
		initComment();
	}
}

function setCookie(cname, cvalue, exdays) {
	//console.log('setCookie');
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires + "; path=/";
}

function prepareFileAttachment() {
	$.extend( true, jQuery.fn, {
        imagePreview: function( options ){
            var defaults = {};
            if( options ){
                $.extend( true, defaults, options );
            }
            $.each( this, function(){
                var $this = $( this );
                $this.bind( 'change', function( evt ){
                    var files = evt.target.files; // FileList object
                    // Loop through the FileList and render image files as thumbnails.
                    for (var i = 0, f; f = files[i]; i++) {
                        // Only process image files.
                        if (!f.type.match('image.*')) {
                        	// its not a valid image file
                        	alert('The file that you selected could not be attached.  Please select a valid image file.');
                        	$('#fileInput').val('');
                        	continue;
                        }
                        var reader = new FileReader();
                        // Closure to capture the file information.
                        reader.onload = (function(theFile) {
                            return function(e) {
                                // Render thumbnail.
                                  //  $('#imageURL').attr('src',e.target.result);
                                 // '<ul class="gallery clearfix"><li><a href="' + e.target.result + '" rel="prettyPhoto[pp_gal]" title=""><img src="' + e.target.result + '"></a></li></ul>'
								//CKEDITOR.instances['commentText'].setData('<a href=""><img src="' + e.target.result + '"></a>');
								var ckData = CKEDITOR.instances['commentText'].getData();
								CKEDITOR.instances['commentText'].setData(ckData + '<img class="img-issue img-rounded img-responsive center-block" src="' + e.target.result + '">');
								$('#fileInput').val('');
                            };
                        })(f);
                        // Read in the image file as a data URL.
                        reader.readAsDataURL(f);
                    }
                });
            });
        }
    });
    $( '#fileInput' ).imagePreview();
}

function issueHandler(projectId,action,categoryId,docVersionId,commentDocPageNo,commentId,postId){
	//console.log('issueHandler', 'action: ' + action);
	switch(action) {
		case 'new':
			addIssue(projectId,'open',categoryId,docVersionId,commentDocPageNo,commentId);
			break;
		case 'reply':
			addIssue(projectId,'open',categoryId,docVersionId,commentDocPageNo,commentId);
			break;
		case 'edit':
			addIssue(projectId,'open',categoryId,docVersionId,commentDocPageNo,commentId);
			break;
		//case 'delete':
			//deletePost('open',categoryId,docVersionId,commentDocPageNo,commentId,postId);
			//break;
		case 'close':
			// destroy the open version
			removeIssue('open',categoryId,docVersionId,commentDocPageNo,commentId);
			// add the closed version
			addIssue(projectId,'closed',categoryId,docVersionId,commentDocPageNo,commentId);
			break;
		//case 'open':
			//openIssue(categoryId,docVersionId,commentDocPageNo,commentId);
			//break;
	}
}

function addIssue(projectId,type,categoryId,docVersionId,commentDocPageNo,commentId) {
	var typeDivId = type;
	var categoryDivId = typeDivId + 'c' + categoryId;
	var docDivId = categoryDivId + 'd' + docVersionId + 'p' + commentDocPageNo;
	var commentDivId = docDivId + 'c' + commentId;
	
	//console.log('addIssue', 'type: ' + type);
	//only auto-expand open issues
	var startingPositionOpen = true;
	if(type == 'closed'){ startingPositionOpen = false };

	// destroy the no issues found message if it's there
	if (document.getElementById('no' + type + 'issues')) {
		$('#no' + type + 'issues').remove();
	};

	// does the commentId already exist?
	if (document.getElementById(commentDivId)) {
		// commentId already exists, just replace it
		refreshIssue(commentId,commentDivId);
	}
	else {
		// commentId does NOT already exist
		// does the docVersionId already exist?
		if (document.getElementById(docDivId)) {
			//console.log('addIssue', 'docDivId: ' + docDivId);
			// the docVersionId already exists
			// append our new issue
			$.get("/secure/cfc/projectIssues.cfc"
				,{
					'method': 'getIssuesView'
					,'type': type
					,'commentId': commentId
					,'startingPositionOpen': startingPositionOpen
				})
			.done(function(data) {
				$('#contente' + docDivId).append(data);
				// update the issue type count
				updateCount(type);
				expandRelevantSection(type,categoryId,docVersionId,commentDocPageNo,commentId);
				if(idtplans.panel) {
					idtplans.panel.counts();
				}
			});
		}
		else {
			// the docVersionId does not exist
			//does the categoryId exist?
			if (document.getElementById(categoryDivId)) {
				//console.log('addIssue', 'categoryId: ' + categoryId, 'docVersionId:' + docVersionId, 'categoryDivId:' + categoryDivId);
				// the categoryId does exist
				// append our new docVersionId
				$.get("/secure/cfc/projectIssues.cfc"
					,{
						'method': 'getIssuesView'
						,'projectId': projectId
						,'type': type
						,'categoryId': categoryId
						,'docVersionId': docVersionId
						,'startingPositionOpen': startingPositionOpen
					})
				.done(function(data) {
					// dev-319 mm 04/23 - appending duplicates existing data --->
					$('#contente' + categoryDivId).html(data);
					//$('#contente' + categoryDivId).append(data);
					// update the issue type count
					updateCount(type);
					expandRelevantSection(type,categoryId,docVersionId,commentDocPageNo,commentId);
					if(idtplans.panel) {
						idtplans.panel.counts();
					}
				});
			}
			else {
				// the category Id does not exist
				// append our new categoryId
				//console.log('addIssue', 'categoryId: ' + categoryId);
				$.get("/secure/cfc/projectIssues.cfc"
					,{
						'method': 'getIssuesView'
						,'projectId': projectId
						,'type': type
						,'categoryId': categoryId
						,'startingPositionOpen': startingPositionOpen
					})
				.done(function(data) {
					$('#contente' + typeDivId).append(data);
					// update the issue type count
					updateCount(type);
					expandRelevantSection(type,categoryId,docVersionId,commentDocPageNo,commentId);
					if(idtplans.panel) {
						idtplans.panel.counts();
					}
				});
			}
		}
	}
};

function removeIssue(type,categoryId,docVersionId,commentDocPageNo,commentId,postId) {
	var typeDivId = type;
	var categoryDivId = typeDivId + 'c' + categoryId;
	var docDivId = categoryDivId + 'd' + docVersionId + 'p' + commentDocPageNo;
	var commentDivId = docDivId + 'c' + commentId;
	
	//console.log('removeIssue', 'type: ' + type, 'commentId:' + commentId);
	if (postId) {
		var postDivId = commentDivId + 'p' + postId;
		var postCount = $('#contente' + commentDivId + ' .post').length;
		if (postCount > 1) {
			//not the last comment, just refresh this comment
			refreshIssue(commentId,commentDivId);
		}
		else {
			//was the last comment delete comment
			removeIssue(type,categoryId,docVersionId,commentDocPageNo,commentId);
		}
	}
	else {
		//destroy this comment
		$('#' + commentDivId).remove();
		// did we destroy the last comment in this docVersionId?
		if ( $('#contente' + docDivId).children().length == 0) {
			// destroy the docDivId
			$('#' + docDivId).remove();
			// did we destroy the last docVersionID in this category?
			if ( $('#contente' + categoryDivId).children().length == 0) {
				//destroy the categoryDivId
				$('#' + categoryDivId).remove();
			}
		}
		// update the issue type count
		updateCount(type);
	}
};

function refreshIssue(commentId,divId) {
	//console.log('refreshIssue', 'commentId: ' + commentId);
	$('#' + divId).load('/secure/cfc/projectIssues.cfc #e' + divId
	,{
		'method': 'getIssuesView'
		,'commentId': commentId
		,'startingPositionOpen': true
	}
	, function() {
		// update the issue type count
		updateCount('open');
	})
};


function reopenIssue(projectId,categoryId,docVersionId,commentDocPageNo,commentId){
	if (confirm('Are you sure that you want to re-open this closed issue?')){
		$.ajax({
			type: "POST",
			url: '/secure/cfc/projectIssues.cfc',
			data: {'method': 'open','projectCommentId': commentId},
			dataType: "json",
			timeout: 5000, // in milliseconds
			success: function(response) {
				if(response.SUCCESS) {
					// destroy the closed version
					removeIssue('closed',categoryId,docVersionId,commentDocPageNo,commentId);
					// add the open version
					addIssue(projectId,'open',categoryId,docVersionId,commentDocPageNo,commentId);
					//expand relevant sections
					expandRelevantSection('open',categoryId,docVersionId,commentDocPageNo,commentId);
				}
				else {
					alert(response.ERRORS[0]);
				}
			},
			error: function(request, status, err) {
				if (status == "timeout") {
					alert('The request timed out, please try again.');
				}
				else{
					alert('an unknown error occurred.')
				}
			}
		});

	}
}

function deletePost(type,categoryId,docVersionId,commentDocPageNo,commentId,commentPostId) {
	if (confirm('Are you sure that you want to delete this post?')){

		$.ajax({
			type: "POST",
			url: '/secure/cfc/projectIssues.cfc',
			data: {'method': 'delete','commentPostId': commentPostId},
			dataType: "json",
			timeout: 5000, // in milliseconds
			success: function(response) {
				if(response.SUCCESS) {
					// destroy the post
					removeIssue(type,categoryId,docVersionId,commentDocPageNo,commentId,commentPostId);
					if(idtplans.panel) {
						idtplans.panel.counts();
					}
				}
				else {
					alert(response.ERRORS[0]);
				}
			},
			error: function(request, status, err) {
				if (status == "timeout") {
					alert('The request timed out, please try again.');
				}
				else{
					alert('an unknown error occurred.')
				}
			}
		});
	}
};


function updateCount(type) {
	var dynamicissuenumbering  = $('dynamicissuenumbering');
	var count = $('#' + type + ' .commentCount').length;
	var dynamic = false;
	if(dynamicissuenumbering.length) {
		dyndata = dynamicissuenumbering.data();
		if(dyndata.enabled && dyndata.enabled == 1) {
			dynamic = true;
		}
	}
	// update the numbering convention for each comment
	if(dynamic) {
		count = 0;
		$('#' + type + ' .commentCount').each(function() {
			$(this).text(++count);
		});
	}
	// update the issue type count header
	$('#' + type + 'count').text(count);
	//console.log('updateCount', 'type ' + type, 'count: ' + count, 'dynamic: ' + dynamic);
	// bind delete issue
	$('.delete-issue').on('click', deleteissue);
}

function expandRelevantSection(type,categoryId,docVersionId,commentDocPageNo,commentId) {
	var typeDivId = type;
	var categoryDivId = typeDivId + 'c' + categoryId;
	var docDivId = categoryDivId + 'd' + docVersionId + 'p' + commentDocPageNo;
	var commentDivId = docDivId + 'c' + commentId;
	if(type == 'open'){
		// if the main issue type container is closed, open it
		if ($('#contente' + typeDivId).is(":hidden")) {
			$('#headere' + typeDivId).trigger('click');
		}
		if ($('#contente' + categoryDivId).is(":hidden")) {
			$('#headere' + categoryDivId).trigger('click');
		}
		if ($('#contente' + docDivId).is(":hidden")) {
			$('#headere' + docDivId).trigger('click');
		}
	}
};

function showAdvancedOptions(label,type) {
	var elem = document.getElementById(type);
	if( elem.style.display == "none" ) {
		//label.innerHTML = "-&nbsp;Hide Advanced Options";
		$(elem).slideDown('slow');
		if (type == "advOptopen") {
			$('#contenteopen').slideDown('slow');
		} else if (type == "advOptclosed") {
			$('#contenteclosed').slideDown('slow');
		}
	}
	else {
		//label.innerHTML = "+&nbsp;Show Advanced Options";
		$(elem).slideUp('slow');
	}
}

function filterComments(type,projectId,expandIssuesWaitingForReply) {
	//get the form values and set vars
	var filterCategories=$("#" + type + "_categories").val();
	var filterReviewers=$("#" + type + "_reviewers").val();
	var filterReviews=$("#" + type + "_reviewcycles").val();
	var filterReviewersFinished=$("#" + type + "_finished_select").val();

	//display a loading img
	 $('#commenttable' + type).html('<div class="center-div" id="loading"><img src="/secure/images/ajax_loader_large.gif"></div>');
	//send the request to update the issues
	$('#commenttable' + type).load('/secure/cfc/projectIssues.cfc?method=getIssuesView&startingPositionOpen=1&type=' + type + '&projectId=' + projectId + '&filterReviewersFinished=' + filterReviewersFinished + '&expandIssuesWaitingForReply=' + expandIssuesWaitingForReply + '&filterCategories=' + filterCategories + "&filterReviewers=" + filterReviewers + "&filterReviews=" + filterReviews
	, function(response, status, xhr) {
	  if (status == "error") {
	    var msg = "Sorry but there was an error: ";
	    $('#commenttable' + type).html(msg + xhr.status + " " + xhr.statusText);
	  }
	});
}

// delete open issue
var deleteissue = function(e) {
	var target = $(e.target).closest('.btn');
	var data = target.data();
	var dialog = idtplans.dialog.show({
		size  : 'modal-sm',
		title : 'Confirmation',
		body  : 'Are you sure you want to delete this issue?',
		buttons: {
			decline: 'Cancel'
		}
	}).data('exec', e);
	dialog.on('click', '.btn-primary', function(e) {
		$.ajax({
			type: 'GET',
			url: '/secure/cfc/projectIssues.cfc',
			data: {method: 'deleteissue', projectid: data.projectid, commentid: data.commentid, contactid: data.contactid},
			dataType: 'json',
			timeout: 5000,
			beforeSend: function() {
				idtplans.dialog.loading();
			},
			success: function(response) {
				if(response.SUCCESS) {
					removeIssue(data.type, data.categoryid, data.docversionid, data.commentdocpageno, data.commentid);
					idtplans.dialog.hide();
					if(idtplans.panel) {
						idtplans.panel.counts();
					}
				} else {
					alert(response.MESSAGE[0]);
				}
			},
			error: function(request, status, err) {
				if (status == 'timeout') {
					alert('The request timed out, please try again.');
				} else{
					alert('an unknown error occurred.')
				}
			},
			complete: function() {
				idtplans.dialog.loading(false);
			}
		});
	});
};

'use strict';

// ensure existence of namespace
var idtplans = idtplans || {};

// issues module
idtplans.issues = {

	controller: null,

	uploader: null,

	init: function() {
		var self = this;
		var doc = $(document);
		var containers = doc.find('.issue-container');
		var uploadcontainer = $('#issues-uploader');
		var mainContainer = $('#mainContainer').length ? $('#mainContainer') : $('#body');

		if(containers.length) {
			// set controller
			self.controller = new idtplans.Controller({
				baseURL : '/secure/',
				section : 'issue',
			});
			// ensure existence of uploader container
			if(!uploadcontainer.length) {
				mainContainer.append('<div id="issues-uploader"></div>');
			}
			// bind dialog actions
			doc.on('click', '.issue-dialog-action', function(e) {
				var self = idtplans.issues;
				var target = $(e.target).closest('.issue-dialog-action');
				var data = target.data();
				e.preventDefault();
				self.dialog(data);
			});
			// bind general actions
			doc.on('click', '.issue-action', self.exec);
			// bind delete
			doc.on('click', '.issue-delete', deleteissue);
		}
	},

	exec: function(e) {
		var self = idtplans.issues;
		var target = $(e.target).closest('.issue-action');
		var data = target.data();
		if(data.action && self.hasOwnPropert(data.action)) {
			self[data.action](e);
		}
	},

	dialog: function(options) {
		var self = idtplans.issues;
		var params = idtplans.url.params();
		var opts = {};
		var dialog;

		if(options) {
			$.extend(opts, options);
		}
		$.extend(params, opts);

		dialog = idtplans.dialog.show({
			size  : 'modal-lg',
			title : 'Project Issue',
			load  : {
				url: '/secure/project/issues/project_issue_data_modal.cfm',
				data: params
			},
			buttons : {
				'accept'  : 'Submit',
				'decline' : 'Cancel'
			},
			ui : {
				static : true
			},
			on : {
				'hide.bs.modal' : function() {
					if (CKEDITOR.instances['commentText']) {
						CKEDITOR.instances['commentText'].destroy();
					}
				}
			}
		});

		//Drop files into editor
		CKEDITOR.on('instanceReady', function(e) {
			CKEDITOR.instances['commentText'].on('drop', function(evt) {
				e = evt.data.$;
				e.preventDefault();
				e.stopPropagation();
				var files = e.dataTransfer.files;
				for (var i = 0, f; f = files[i]; i++) {
					// Only process image files.
					if (!f.type.match('image.*')) {
						// its not a valid image file
						alert('The file that you selected could not be attached.  Please select a valid image file.');
						continue;
					}
					var reader = new FileReader();
					// Closure to capture the file information.
					reader.onload = function(event) {
						var editor = CKEDITOR.instances['commentText'];
						var element = editor.document.createElement('img', {
							attributes: {
								src: event.target.result
							}
						});
						//Timeout is used to avoid bug where inserted at first caret position
			            setTimeout(function () {
			                editor.insertElement(element);
			            }, 10);
					}

					// Read in the image file as a data URL.
					reader.readAsDataURL(f);
				}
				evt.stop();
			});
		});

		//Handles adding attachments if using file browser or drag and drop
		var addAttachment = function(e) {
			//Don't overwrite existing attachments
			var attachments = dialog.data('attachments') ? dialog.data('attachments') : [];
			var files;
			var attmap = {};

			if (e.dataTransfer) {
				//drang and drop
				files = e.dataTransfer.files;
			} else if (e.target) {
				//file browser
				files = e.target.files;
			}

			for(var i = 0, a; a = attachments[i]; i++) {
				attmap[a.name] = null;
			}

			for(var i = 0, f; f = files[i]; i++) {
				if(!f.type.match('image.*') || attmap.hasOwnProperty(f.name)) {
					continue;
				}
				attachments.push(f);
			}
			dialog.data('attachments', attachments);

			//Init gallery with callback handler that removes attachments from dialog data
			idtplans.gallery.init('#issue-attachments', attachments, {
				height   : 50,
				reset    : true,
				edit     : true,
				callback : function(e) {
					var target = $(e.target).closest('.gallery-remove');
					var thumb = target.closest('.gallery-item');
					var filename = thumb.find('img').attr('id');
					var attachments = idtplans.dialog.data('attachments');
					var files = [];

					for(var i = 0, a; a = attachments[i]; i++) {
						if(a.name != filename) {
							files.push(a);
						}
					}
					idtplans.dialog.data('attachments', files);
					thumb.remove();
				}
			});
		};

		// after content loaded
		dialog.on('dialogcontentready', function() {
			initEditor();
			dialog.find('.popover-hover').popover({
				container : 'body',
				trigger   : 'hover click'
			});
			//Get all .gallery-preload items
			var attachments = dialog.data('attachments') ? dialog.data('attachments') : [];

			$(".gallery-preload").each(function(i, obj) {
				//Get the data elements of preloaded images
				var data = $(obj).data();

				//Put the data elements into a mock file object to push to attachments
				var file = {
					name  : data.attachmentName,
					src   : data.attachmentSrc,
					attId : data.attachmentId
				}

				//Push to array
				attachments.push(file);

				//Remove preload element
				$(obj).remove();
			});

			if(attachments.length) {
				//Load attachments into dialog data attachments element
				dialog.data('attachments', attachments);
				//Initialize gallery
				idtplans.gallery.init('#issue-attachments', attachments, {height: 50, reset:false, edit:true, callback:function(e) {
					var target = $(e.target).closest('.gallery-remove');
					var thumb = target.closest('.gallery-item');
					var file = thumb.find('img').attr('id');
					thumb.remove();
					var attachments = $.grep(idtplans.dialog.data('attachments'), function(f) {
						return f.name != file;
					});
					idtplans.dialog.data('attachments', attachments);
				}});
			}

			var dropzone = dialog.find('.dropzone');
			//Drop zone for drag-n-drop of files
			dropzone.on('dragover', function(e) {
				e.preventDefault();
				e.stopPropagation();
				dropzone.addClass('dropzone-dragover');
			});

			dropzone.on('dragleave', function(e) {
				e.preventDefault();
				e.stopPropagation();
				dropzone.removeClass('dropzone-dragover');
			});
			dropzone.on('drop', function(e) {
				e.preventDefault();
				e.stopPropagation();
				dropzone.removeClass('dropzone-dragover');
				addAttachment(e.originalEvent);
			});

			// attachment selection handler
			dialog.find('#dFileInput').on('change', function(e) {
				addAttachment(e);
			});
		});

		// submit handler
		dialog.on('click', '.btn-primary', function(e) {
			var self = idtplans.issues;
			var form = dialog.find('#projectIssues');
			var data = form.serializeArray();
			var msgs = [];
			var title = dialog.find('#commentTopic');
			var text = dialog.find('#commentText');

			self.controller = new idtplans.Controller({
				baseURL : '/secure/',
				section : 'issue',
			});

			// clear errors
			dialog.find('.has-error').removeClass('has-error');

			// validate input
			if(title.is(':visible') && !title.val().length) {
				title.closest('.form-group').addClass('has-error');
				msgs.push('Please enter a title');
			}
			if(!text.val().length) {
				text.closest('.form-group').addClass('has-error');
				msgs.push('Please enter a comment');
			}
			//check for file:// images
			var pattern = /file\:\/\//;
			if(text.val().search(pattern) !== -1) {
				if (!confirm('Images referencing a local file were found in your comment. These will be removed. Continue with save?')) {
					return;
				}
			}
			if(msgs.length) {
				idtplans.tooltip.show(dialog.find('.modal-footer'), {
					content : msgs.join('<br/>'),
					html    : true,
					timeout : 3000
				});
				return false;
			}

			params.method = params.action;
			delete params.action;
			dialog.loading();

			var dataAttachments = [];
			var newAtt = false; //marker for new attachments

			if(dialog.data('attachments')) {
				//Get all pre-loaded attachments
				var existingAttachments = $.grep(dialog.data('attachments'), function(f) {
					return f.attId !== undefined;
				});

				if(dialog.data('attachments').length !== existingAttachments.length) {
					newAtt = true;
				}

				//Store existing ids into array
				for(var i=0, a; a=existingAttachments[i]; i++) {
					dataAttachments.push(a.attId);
				}
			}
			//Add to data values
			var attachments = {};
			attachments.name = "attachments";
			attachments.value = dataAttachments;
			data.push(attachments);

			//Add marker for new images
			var newAttachments = {};
			newAttachments.name = "newAttachments";
			newAttachments.value = newAtt;
			data.push(newAttachments);

			self.controller.action('data', data, {
				method: 'POST'
			}).done(function(res) {
				if(res && typeof res === 'object') {
					if(res.SUCCESS === true) {
						// upload files if new ones exist
						var attachments = dialog.data('attachments');
						if(attachments && attachments.length && newAtt) {
							var names = [];
							var fparts, fname;
							for(var i=0, a; a=attachments[i]; i++) {
								fparts = [
									res.DATA.projectId,
									res.DATA.projectCommentId,
									res.DATA.commentPostVersionId,
									a.name.replace(/[^a-zA-Z0-9\_\-\.]/g, '')
								];
								fname = fparts.join('_');
								res.DATA.type = a.type;
								names.push(fname);
							}
							dialog.data('comment', res.DATA);
							self.upload(attachments, names);
						} else {
							issueHandler(
								res.DATA.projectId,
								res.DATA.action,
								res.DATA.commentCategoryId,
								res.DATA.docVersionId,
								res.DATA.commentDocPageNo,
								res.DATA.projectCommentId,
								res.DATA.commentPostId
							);
							dialog.loading(false);
							dialog.hide();
						}
						if(idtplans.panel !== undefined && idtplans.panel) {
							idtplans.panel.counts();
						}
					} else {
						// handle error
						dialog.loading(false);
						alert('Could not save comment.  Please try again');
					}
				} else {
					// handle error
					dialog.loading(false);
					alert('Error saving comment.  Please try again');
				}
			}).fail(function() {
				dialog.loading(false);
				alert('Error connecting to server.  Please try again');
			});
		});
	},

	upload: function(files, names) {
		var self = idtplans.issues;
		var files = files || null;
		var names = names || null;
		var uploadcontainer = $('#issues-uploader');
		var mainContainer = $('#mainContainer').length ? $('#mainContainer') : $('#body');

		if(files && files.length) {
			// reload uploader each time to ensure policy expiration reset
			self.controller.action('uploader').done(function(data) {
				if(!uploadcontainer.length) {
					mainContainer.append('<div id="issues-uploader"></div>');
				}

				$('#issues-uploader').html(data);
				$(document).off('issueuploaderready');
				$(document).on('issueuploaderready', function() {
					// load queue
					for(var i=0, f, n; f=files[i], n=names[i]; i++) {
						if(f && n) {
							self.uploader.addFile(f, n);
						}
					}
					// start upload
					self.uploader.start();
				});
			});
		}
	},

	uploaded: function(data) {
		var self = idtplans.issues;
		var dialog = idtplans.dialog;
		var comment = idtplans.dialog.data('comment');
		var fname, params;
		// create attachment records
		for(var i=0, key; key=data[i]; i++) {
			fname = key.split('/').pop();
			params = {
				name : fname,
				uri  : key
			};
			$.extend(params, comment);
			delete params.action;
			self.controller.action('attachment', params, {
				method: 'POST'
			}).fail(function() {
				alert('Comment saved but unable to save attachment data.');
			});
		}

		issueHandler(
			comment.projectId,
			comment.action,
			comment.commentCategoryId,
			comment.docVersionId,
			comment.commentDocPageNo,
			comment.projectCommentId,
			comment.commentPostId
		);

		self.uploader.destroy();
		dialog.loading(false);
		dialog.hide();
	}
}

$(function() {
	idtplans.issues.init();
});


