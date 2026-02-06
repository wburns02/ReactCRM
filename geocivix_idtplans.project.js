'use strict';

/**
 * namespace
 **/
var idtplans = idtplans || {};

/**
 * project library
 **/
idtplans.project = {

	controller: null,

	container: null,

	/**
	 * constructor called when loaded
	 **/
	init: function() {
		var self = this;

		self.container = $(document);

		// controller with base
		self.controller = new idtplans.Controller({
			baseURL : '/secure/',
			section : 'project'
		});

		self.container.on('click', '.submit-project-revision-btn', self.revision);
		self.container.on('click', '.project-archive-settings-lnk', self.projArchive);
		self.container.on('click', '.project-rel-action', self.relationship);
		self.container.on('click', '.project-section-link', self.section);
		self.container.on('click', '.project-action', self.exec);
		self.container.on('click', '.submit-project-reopen-btn', self.reopen);
		self.container.on('click', '.subscribeToggle', self.subscribe);
		
	},

	exec: function(e) {
		e.preventDefault();
		e.stopImmediatePropagation();
		var self = idtplans.project;
		var target = $(e.target).closest('.project-action');
		var data = target.data();
		var params = idtplans.url.params();
		var fn = data.fn || null;

		$.extend(data, params);

		if(fn && self.hasOwnProperty(fn)) {
			self[fn](e, target, data);
		}
	},

	expire: function(e, target, data) {
		e.preventDefault();
		var self = idtplans.project;
		var params = {
			projects: data.projectid,
			portalid: data.portalid
		};

		if (confirm('Are you sure that you would like to remove this project?')) {
			self.controller.action('delete', params).done(function(res) {
				if(res.SUCCESS) {
					var row = target.closest('tr');
					row.addClass('danger').fadeOut(500, function() {row.remove()});
				} else {
					alert('An error occurred. Please try again or contact support.');
				}
			});
		}
	},

	/**
	 * Submit a project revision dialog
	 */
	revision: function(e) {
		var self = idtplans.project;
		var target = $(e.target).closest('.submit-project-revision-btn');
		var data = target.data();
		var projectId = data.projectid;
		var requirereason = data.requirereason || false;
		var requireapplication = data.requireapplication || false;
		var dialog = idtplans.dialog;
		var uri = '/secure/project/permits/?step=submitrevision&projectid=' + projectId + '&requireapplication=' + requireapplication;

		if(data.src) {
			uri += '&src=' + data.src;
		}

		if(data.requirereason) {
			dialog.show({
				title: 'Submit Project Revision',
				view: {
					name: 'project.revision'
				},
				size: 'modal-md',
				buttons	: {
					accept	: 'Start',
					decline	: 'Cancel'
				}
			});

			dialog.on('click', '.btn-primary', function(e) {
				$('.has-error').removeClass('has-error');

				if(!$.trim(dialog.find('#project-revision-reason').val()).length) {
					dialog.find('#form-group-project-revision-reason').addClass('has-error');
				}

				if(!dialog.find('.has-error').length) {
					var data = {
						tableName: 'Projects',
						tableId: projectId,
						note: 'Reason for revision: ' + dialog.find('#project-revision-reason').val()
					}

					//add note
					dialog.action('note.save', data, {method: 'POST'}).done(function(res) {
						if(res.SUCCESS) {
							location.href = uri;
						} else if(res.MESSAGE && res.MESSAGE.length) {
							alert(res.MESSAGE);
						} else {
							alert('Unknown Error');
						}
					});
				}
			});
		} else {
			var title = target.find('.revision-content').text();
			var body = target.find('.revision-help').data('content');
			dialog.show({
				title: title,
				body : body,
				size: 'modal-md',
				buttons	: {
					accept	: 'Proceed',
					decline	: 'Cancel'
				},
				ui: {
					static: true
				}
			});
			dialog.on('click', '.btn-primary', function() {
				location.href = uri + '&confirmed=1';
			});
		}
	},

	/**
	 * Re-open closed project dialog
	 */
	reopen: function(e) {
		var self = idtplans.project;
		var target = $(e.target).closest('.submit-project-reopen-btn');
		var data = target.data();
		var projectId = data.projectid;
		var dialog = idtplans.dialog;

		var title = target.find('.reopen-content').text();
		var body = target.find('.reopen-help').data('content');
		dialog.show({
			title: 'Re-open Closed Project',
			body : 'Are you sure you want to re-open this project?',
			size: 'modal-md',
			buttons	: {
				accept	: 'Confirm',
				decline	: 'Cancel'
			},
			ui: {
				static: true
			}
		});
		dialog.on('click', '.btn-primary', function() {
			self.controller.action('reopen', data, {
				method : 'post'
			}).done(function(res) {
				if(res.SUCCESS) {
					window.location.reload();
				}
			}).always(function() {
				dialog.hide();
			});
		});
	},

	/**
	 * Presents a dialog with archive options for the project
	 */
	projArchive: function(e) {
		var self = idtplans.project;
		var projectId = $(e.target).closest('a').data('projectid');
		var dialog = idtplans.dialog;

		dialog.show({
			title: 'Project Archive Settings',
			load: {
				url: '/?action=project.archiveSettings',
				data: {
					'projectId' : projectId
				}
			},
			size: 'modal-md',
			buttons	: [
				'<button type="button" class="btn btn-default archive-now pull-left">Archive Now</button>',
				'<button type="button" class="btn btn-default archive-cancel" data-dismiss="modal">Cancel</button>',
				'<button type="button" class="btn btn-primary archive-save">Save</button>'
			]
		});

		/* expand and collapse date field section when checkbox clicked */
		dialog.on('change', '#project-archive', function(el) {
			if ($(el.target).prop('checked')) {
				dialog.find('#archive-settings').slideDown('slow');
			} else {
				dialog.find('#archive-settings').slideUp('slow');
			}
		});

		/* call save */
		dialog.on('click', '.archive-save', function(el) {
			var archiveProject = $('#project-archive').prop('checked');
			var archiveAfter = $('#archive-after-date').val();

			var data = {
				projectId : projectId,
				archiveAfter : archiveProject ? archiveAfter : ''
			};

			dialog.action('archive.save', data, {method: 'POST'}).done(function(res) {
				if(res.SUCCESS) {
					dialog.hide();
				} else if(res.MESSAGE && res.MESSAGE.length) {
					$('#project-archive-setting-message').addClass('alert-danger');
					$('#project-archive-setting-message').text(res.MESSAGE);
					$('#project-archive-setting-message').slideDown();
				} else {
					$('#project-archive-setting-message').addClass('alert-danger');
					$('#project-archive-setting-message').text('An unknown error has occurred.');
					$('#project-archive-setting-message').slideDown();
				}
			});
		});

		/* call archive now */
		dialog.on('click', '.archive-now', function(el) {
			var archiveAfter = $('#archive-after-date').val();

			if (!archiveAfter.length) {
				var curDate = new Date();
				archiveAfter = curDate.getMonth() + '/' + curDate.getDate() + '/' + curDate.getFullYear();
			}

			var data = {
				projectId    : projectId,
				archiveAfter : archiveAfter
			};

			// save archive date (today if not provided) so all future documents will be archived
			dialog.action('archive.save', data, {method: 'POST'}).done(function(res) {
				if (res.SUCCESS) {
					//archive project now
					dialog.action('archive.process', data, {method: 'POST'});

					$('#project-archive-setting-message').addClass('alert-info');
					$('#project-archive-setting-message').text('The project has been submitted for archiving. Depending on the number of files and their sizes this may take some time. You may close this window and continue working.');
					dialog.find('.archive-save').hide();
					dialog.find('.archive-now').hide();
					dialog.find('.archive-cancel').text('Close');
					$('#project-archive-setting-form').slideUp();
					$('#project-archive-setting-message').slideDown();
				} else if(res.MESSAGE && res.MESSAGE.length) {
					$('#project-archive-setting-message').addClass('alert-danger');
					$('#project-archive-setting-message').text(res.MESSAGE);
					$('#project-archive-setting-message').slideDown();
				} else {
					$('#project-archive-setting-message').addClass('alert-danger');
					$('#project-archive-setting-message').text('An unknown error has occurred.');
					$('#project-archive-setting-message').slideDown();
				}
			});
		});
	},

	inspections: function() {
		var self = idtplans.project;
		var section = $('#exp_inspections');
		var subs = [];
		var params = idtplans.url.params();
		if(section.length) {
			// controller with base
			var ctl = new idtplans.Controller({
				baseURL   : '/secure/',
				container : '#exp_inspections'
			});
			section.find('.expand-group .expand-content:visible').each(function() {
				subs.push($(this).attr('id'));
			});
			params.inspectionsexpanded = 1;
			params.inspectionexpsubs = subs.join(',');
			ctl.view('inspection.list', params).done(function() {
				idtplans.ui.popover(ctl.container);
			});
		}
	},

	inspectiontype: function() {
		var self = idtplans.project;
		var params = idtplans.url.params();
		var dialog = idtplans.dialog;

		dialog.show({
			title : 'Add required inspection',
			view  : {
				name : 'project.inspection-select',
				data : params
			},
			buttons : {
				accept  : 'Save',
				decline : 'Cancel'
			},
			ui : {
				static : true
			}
		});

		dialog.on('click', '.btn-primary', function() {
			var field = dialog.find('#inspectiontypeid');
			var issuanceField = dialog.find('#issuanceid');
			var newField = dialog.find('#permitpublicid');

			// mm 01/25 - trim newField
			newField.val(newField.val().trim());

			dialog.find('.form-group').removeClass('has-error');
			if(!field.val().length) {
				field.closest('.form-group').addClass('has-error');
				return false;
			}

			params.inspectiontypeid = field.val();

			if(issuanceField.length) {
				if(!issuanceField.val().length) {
					issuanceField.closest('.form-group').addClass('has-error');
					return false;
				}
				params.issuanceid = dialog.find('#issuanceid').val();
				if (params.issuanceid == 'new' && !newField.val().length) {
					newField.closest('.form-group').addClass('has-error');
					return false;
				}
				params.permitpublicid = dialog.find('#permitpublicid').val();
			}

			dialog.loading();
			self.controller.action('inspectiontype', params, {
				method: 'POST'
			}).done(function(res) {
				if(res.SUCCESS) {
					dialog.hide();
					self.inspections();
				} else {
					alert('Error adding Inspection Type');
				}
			}).fail(function() {
				alert('Error adding Inspection Type');
			}).always(function() {
				dialog.loading(false);
			});
		});
	},


	inspectionsummary: function() {
		var self = idtplans.project;
		var params = idtplans.url.params();
		var inspectionSummary = '/?action=inspection.inspection-summary&projectid=' + encodeURIComponent(params.projectid);
		window.open(inspectionSummary, '_blank');


		var field = $('#inspectionid');
		var issuanceField = $('#issuanceid');
		var newField = $('#permitpublicid');

		$('.form-group').removeClass('has-error');

		// Validate required fields
		if (!field.val().length) {
			field.closest('.form-group').addClass('has-error');
			return false;
		}

		params.inspectiontypeid = field.val();

		if (issuanceField.length) {
			if (!issuanceField.val().length) {
				issuanceField.closest('.form-group').addClass('has-error');
				return false;
			}
			params.issuanceid = issuanceField.val();
			if (params.issuanceid === 'new' && !newField.val().length) {
				newField.closest('.form-group').addClass('has-error');
				return false;
			}
			params.permitpublicid = newField.val();
		}

		self.controller.action('inspectionsummary', params, {
			method: 'POST'
		}).done(function(res) {
			if (res.SUCCESS) {
				console.log('Inspection Summary loaded successfully.');
				self.inspections();
			} else {
				alert('Error viewing Inspection Summary');
			}
		}).fail(function() {
			alert('Error viewing Inspection Summary');
		}).always(function() {
			console.log('Completed processing Inspection Summary.');
		});
	},


	relationship: function(e) {
		e.preventDefault();
		var self = idtplans.project;
		var target = $(e.target).closest('.project-rel-action');
		var data = target.data();
		var params = idtplans.url.params();
		var dialog = idtplans.dialog;
		var section = $('#project-rel-expand');

		if(data.method === 'relate') {
			dialog.show({
				title: 'Link Project',
				load: {
					url  : '/?action=project.relationship-editor',
					data : data
				},
				size: 'modal-md',
				buttons	: [
					'<button type="button" class="btn btn-default archive-cancel" data-dismiss="modal">Cancel</button>',
					'<button type="button" class="btn btn-primary archive-save">Save</button>'
				]
			});

			dialog.on('dialogcontentready', function() {
				dialog.find('.popover-hover').popover({html: true, trigger: 'hover', placement: 'auto', container: 'body'});
				setTimeout(function() {
					var input = dialog.find('input[type=text]').first();
					input.on('keypress', function(e) {
						if(e.which === 13) {
							e.preventDefault();
							dialog.find('.btn-primary').click();
						}
					});
					input.focus();
				}, 500);
			});

			dialog.on('click', '.btn-primary', function(e) {
				var subprojectid = dialog.find('#sub-project').val();
				if(subprojectid) {
					data.parentprojectid = params.projectid;
					data.projectid = subprojectid;

					self.controller.action('relationship', data, {
						method : 'POST'
					}).done(function(res) {
						if(res.SUCCESS) {
							params.expandrels = true;
							self.controller.action('relationships', params).done(function(res) {
								section.html(res);
							});
							dialog.hide();
							if(idtplans.panel) {
								idtplans.panel.counts();
							}
						} else {
							// show error
							dialog.find('#project-rel-msg').slideDown();
						}
					});
				}
			});
		} else if(data.method === 'unrelate') {
			if(confirm('Are you sure you want to unlink this project?')) {
				self.controller.action('relationship', data, {
					method : 'POST'
				}).done(function(res) {
					if(res.SUCCESS) {
						params.expandrels = true;
						self.controller.action('relationships', params).done(function(res) {
							section.html(res);
						});
						if(idtplans.panel) {
							idtplans.panel.counts();
						}
					}
				}).always(function() {
					dialog.hide();
				});
			}
		}
	},

	section: function(e) {
		var target = e.target ? $(e.target).closest('.project-section-link') : e;
		var data = e.target ? target.data() : e;
		if(data.section) {
			var sec = $('#' + data.section);
			if(sec.length) {
				var header = sec.find('.expand-header');
				var content = sec.find('.expand-content');
				// open section
				if(!content.is(':visible')) {
					header.click();
				}
				// scroll to section
				$('html,body').animate({scrollTop: header.offset().top -10});
			}
		}
	},

	requirement : function(e, target, data) {
		var self = idtplans.project;
		var dialog = idtplans.dialog;
		var ctlaction = data.action;
		var fn;
		delete data.action;
		if(data.callback) {
			fn = idtplans.util.fn(data.callback);
		}

		/*
			{
				resource : ( Permit | Inspection )
				action   : controller action
				method   : ( waive | restore )
			}
		 */

		switch(data.method) {
			case 'waive':
				// prompt for waive reason
				dialog.show({
					title : data.resource + ' Waive Reason',
					load  : {
						url  : '/secure/?action=project.waive',
						data : data
					},
					ui    : {
						static : true
					},
					buttons : {
						accept  : 'Save',
						decline : 'Cancel'
					},
					focus : 'textarea'
				});

				// save
				dialog.on('click', '.btn-primary', function() {
					// validate input
					var form = dialog.find('#project-requirement-waive');
					var field = dialog.find('#project-requirement-waive-reason');
					var params = form.serializeArray();

					form.removeClass('has-error');

					if(field.val().length) {
						dialog.loading();
						self.controller.action(ctlaction, params, {
							method: 'POST'
						}).done(function(res) {
							if(res.SUCCESS) {
								dialog.hide();
								if(data.callback) {
									fn(data);
								}
								idtplans.note.load();
							} else {
								alert('Error waiving ' + data.resource);
							}
						}).fail(function() {
							alert('Error waiving ' + data.resource);
						}).always(function() {
							dialog.loading(false);
						});
					} else {
						field.closest('.form-group').addClass('has-error');
					}
				});
				break;
			case 'restore':
				data.restore = true;
				self.controller.action(ctlaction, data, {
					method: 'POST'
				}).done(function(res) {
					if(res.SUCCESS) {
						if(data.callback) {
							fn(data);
						}
					} else {
						alert('Error restoring ' + data.resource);
					}
				}).fail(function() {
					alert('Error restoring ' + data.resource);
				});
			break;
		}
	},

	messages: function() {
		var self = idtplans.project;
		var div = self.container.find('#responsePrompt');

		if(div.length) {
			idtplans.overlay.show({
				context: div
			});
			self.controller.load({
				url  : '/secure/project/messages/',
				data : idtplans.url.params()
			}).done(function(res) {
				div.html(res);
				idtplans.ui.popover('#responsePrompt');
			}).fail(function() {
				div.html('Failed to load project data.  Please try reloading the page.');
			}).always(function() {
				idtplans.overlay.hide(div);
			});
		}
	},

	contact: function(e, target, data) {
		var self = idtplans.project;
		var dialog = idtplans.dialog;
		var parent = target.parent();
		var params = {
			addressbookid : data.addressbookid,
			projectid     : data.projectid,
			type          : data.type
		};

		dialog.show({
			title: 'Add Project Contact',
			view: {
				name : 'contact.edit',
				data : params
			},
			ui: {
				static: true
			},
			buttons: {
				accept  : 'Save',
				decline : 'Cancel'
			}
		});

		// save
		dialog.on('click', '.btn-primary', function() {
			var fields = dialog.find('#contact-form').serializeArray();
			dialog.loading();
			dialog.find('.has-error').removeClass('has-error');
			self.controller.action('project.contact', fields, {
				method: 'POST'
			}).done(function(res) {
				if(res.SUCCESS) {
					// append new item to list and select
					if(parent.hasClass('input-group-addon')) {
						var group = target.closest('.input-group');
						var select = group.find('select');
						var option = $('<option value="" data-type=""></option>');
						option.attr('value', res.DATA.ID);
						option.attr('data-type', res.DATA.CONTACTTYPE);
						option.text(res.DATA.LABEL);
						select.append(option);
						select.val(res.DATA.ID).change();
					}
					if(data.callback) {
						var fn = idtplans.util.fn(data.callback);
						if(fn) {
							fn();
						}
					}
					dialog.hide();
				} else if(res.ERRORS.length) {
					for(var i=0, e; e=res.ERRORS[i]; i++) {
						dialog.find('#' + e.id)
							.closest('.form-group')
							.addClass('has-error');
					}
				} else {
					alert('Error saving contact');
				}
			}).fail(function() {
				alert('Error saving contact');
			}).always(function() {
				dialog.loading(false);
			});
		});
	},

	contacts: function(e, target, data) {
		var self = idtplans.project;
		var dialog = idtplans.dialog;
		var parent = target.parent();

		dialog.show({
			size: 'modal-lg',
			title: 'Manage Project Contacts',
			view: {
				name : 'project.addressbook',
				data : data
			},
			ui: {
				static: true
			},
			buttons: [
				'<button class="btn btn-default" data-dismiss="modal">Close</button>'
			]
		});
	},

	locations: function(e, target, data) {
		var self = idtplans.project;
		var dialog = idtplans.dialog;
		var params = {
			issuanceid : data.issuanceid || 0,
			projectid  : data.projectid || 0
		};

		dialog.show({
			title: 'Select Address',
			view: {
				name : 'project.location-select',
				data : params
			},
			ui: {
				static: true
			},
			buttons: [
				'<button class="btn btn-default archive-cancel" data-dismiss="modal">Cancel</button>'
			]
		});

		// save and display selection
		dialog.on('click', '.address', function(btn) {
			var address = btn.target.innerText;

			if(address.length) {
				target.closest('.form-group').find('input').val(address);
				dialog.hide();
			}
		});
	},

	location: function(e, target, data) {
		var self = idtplans.project;
		var group = target.closest('.form-group');

		if(group.length) {
			group.find('input').val(target.text()).click();
		}
	},

	prompt: function() {
		var self = idtplans.project;
		var params = idtplans.url.params();
		var container = $('#idt-project-prompt');

		self.controller.view('project2.prompt', params, {
			container: container
		});
	},

	subscribe : function(e) {
		var self = idtplans.project;
		var isChecked = 0;
		var dataItems = e.target.getAttribute('data-items');
		if (e.target.checked) {
			isChecked = 1;
		}

		var data = {
			projectid : dataItems
		};

		self.controller.action('project.subscribe', data, {
			method : 'post'
		}).done(function(res) {
			
			if (res.SUCCESS) {
				var target = document.querySelector('#trackingToggle');
				if (isChecked) {
					target.innerHTML = "Subscribed";
				} else {
					target.innerHTML = "Unsubscribed";
				}				
			} else {
				alert('An error occured.');
			}

		}).fail(function() {
			alert('There was a connection failure.');
		});

	}
};

/**
 * init library
 **/
$(function() {
	idtplans.project.init();
});
