/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');
const common = require('./app/common.js');
const d = require('./../libs/debugger.js');
const path = require("path");
const ipccallbacks={};
const ipccallbacksSubs={};

common.setipc(ipcRenderer,ipccallbacks,ipccallbacksSubs);

let firstLoad = true;

document.addEventListener('DOMContentLoaded', () => {

    const jqdWarn = $('#ddbLink > .badge-warning')
        .on('dblclick',(e)=>{
            $(e.currentTarget).text('');
            e.stopPropagation();
        })
        .on('click',(e)=>{e.stopPropagation();})
    const jqdError = $('#ddbLink > .badge-danger').on('dblclick',(e)=>{
        $(e.currentTarget).text('');
        e.stopPropagation();
    })
        .on('click',(e)=>{e.stopPropagation();})

    ipcRenderer.on('asynchronous-reply', (event, arg, xData) => {
        //console.log(arg);
        switch (arg) {
            case 'clearMIDICIList':{
                $('#umpDevices').children().not('#manualprojects').remove();
                break;
            }

            case 'removeMUID':{
                $('[data-muid='+xData.muid+']').remove();
                break;
            }
            case 'umpDevRemove': {
                $('[data-umpDev="' + xData.umpDev + '"]').remove();
                // Remove from MT3 available devices
                if (window.mt3AvailableDevices) {
                    const index = window.mt3AvailableDevices.indexOf(xData.umpDev);
                    if (index > -1) {
                        window.mt3AvailableDevices.splice(index, 1);
                    }
                }
                // Update device dropdown
                updateMT3DeviceDropdown();
                break;
            }
            case 'umpDev': {
                createUMPCard(xData.umpDev);
                addUMPDevHead(xData.umpDev,xData.endpoint);
                addUMPDevFBs(xData.umpDev,xData.endpoint.blocks);
                // Store device for MT3 sender
                if (!window.mt3AvailableDevices) {
                    window.mt3AvailableDevices = [];
                }
                if (window.mt3AvailableDevices.indexOf(xData.umpDev) === -1) {
                    window.mt3AvailableDevices.push(xData.umpDev);
                }
                // Update device dropdown
                updateMT3DeviceDropdown();
                break;
            }



            case 'MIDIDevices':
                //console.log($('#deviceInList,#deviceOutList,#deviceLocalList'));

                window.m1Devices = xData.midiDevices;

                $('.deviceIn,.deviceOut')
                    .empty()
                    .append(
                        '<option value="">-- Select a MIDI connection --</option>'
                    );

                xData.midiDevices.in.map(o=>{
                    $('<option/>',{value:o.inName} )
                        .text(o.inName).appendTo('.deviceIn');


                });
                xData.midiDevices.out.map(name=>{
                    $('<option/>',{value:name} )
                        .text(name).appendTo('.deviceOut');
                });
                common.setValues();
                common.setValueOnChange();

                break;
            case 'configSettings':
                window.configSetting = xData;
                if(!xData.hidehelpPopup && firstLoad){
                    $('#getStarted').modal({show:true});
                    firstLoad = false;
                }
                buildUMPDevice();


                common.setValues();
                common.setValueOnChange();
                common.updateView();
                break;
            case 'alert':
                common.buildModalAlert(xData.msg, xData.type);
                break;
            case 'increaseWarn':{
                if(xData === -1){
                    jqdWarn.text('');
                }else{
                    jqdWarn.text(parseInt(jqdWarn.text() || 0,10)+xData);
                }

                break
            }
            case 'increaseError':{
                if(xData === -1){
                    jqdError.text('');
                }else {
                    jqdError.text(parseInt(jqdError.text() || 0, 10) + 1);
                }
                break
            }
        }
    });

    ipcRenderer.send('asynchronous-message', 'getConfig');
    ipcRenderer.send('asynchronous-message', 'getMIDIDevices');

    $('#configModal,#m1Modal').on('hidden.bs.modal', function (e) {
        // do something...
        //$('#discoverAllUMPMIDICI').trigger("click");
        ipcRenderer.send('asynchronous-message', 'getAllUMPDevicesFunctionBlocks');
    });

    $('#showAbout').on('click',()=>{
        $('#getStarted').modal({show:true});
    })





    setTimeout(()=>{
        //jqDiscover.trigger('click');
        ipcRenderer.send('asynchronous-message', 'getAllUMPDevicesFunctionBlocks');
        },500);

    $(function () {
        $('[data-tooltip="tooltip"]').tooltip()
    })
    
    // Toggle debug panel instead of opening debug window
    $('#ddbLink').off('click').on('click', function(e) {
        e.preventDefault();
        $('#debugPanel').toggleClass('show');
    });
    
    // MT3 Packet Sender
    $('#mt3SendBtn').on('click', function() {
        sendMT3Packets();
    });
    
    // Scroll to step status button - simplified approach
    $(document).ready(function() {
        $('#scrollToStatusBtn').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const stepStatusEl = document.getElementById('stepStatus');
            if (stepStatusEl) {
                // Show it if hidden
                if (stepStatusEl.style.display === 'none') {
                    stepStatusEl.style.display = 'block';
                }
                
                // Use native scrollIntoView for better compatibility
                stepStatusEl.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start',
                    inline: 'nearest'
                });
            }
        });
    });
    
    // Store available devices for MT3 sender
    window.mt3AvailableDevices = [];
    
    // Initialize device dropdown
    updateMT3DeviceDropdown();
    
    // Initialize debug data on page load (debug.js will handle this, but ensure it's loaded)
    // The debug.js script handles the initial data loading

    // MIDI 2.0 Step Buttons Event Handlers
    $('#step1Button').on('click', function() {
        executeStep1();
    });

    $('#step2Button').on('click', function() {
        executeStep2();
    });

    $('#step3Button').on('click', function() {
        executeStep3();
    });

    $('#step4Button').on('click', function() {
        executeStep4();
    });

    $('#step5Button').on('click', function() {
        executeStep5();
    });

    $('#step6Button').on('click', function() {
        executeStep6();
    });

    $('#step7Button').on('click', function() {
        executeStep7();
    });

    // Button 6 Configuration Modal Handlers
    $('input[name="step6TargetType"]').on('change', function() {
        const targetType = $(this).val();
        $('#channelSpecParams').hide();
        $('#groupSpecParams').hide();
        $('#functionBlockParams').hide();
        
        if (targetType === 'channel') {
            $('#channelSpecParams').show();
        } else if (targetType === 'group') {
            $('#groupSpecParams').show();
        } else if (targetType === 'functionBlock') {
            $('#functionBlockParams').show();
        }
    });

    $('#step6ExecuteBtn').on('click', function() {
        const targetType = $('input[name="step6TargetType"]:checked').val();
        const config = {};
        
        if (targetType === 'channel') {
            config.type = 'channel';
            config.group = parseInt($('#step6Group').val());
            config.channel = parseInt($('#step6Channel').val());
        } else if (targetType === 'group') {
            config.type = 'group';
            config.group = parseInt($('#step6GroupOnly').val());
        } else if (targetType === 'functionBlock') {
            config.type = 'functionBlock';
            config.functionBlock = parseInt($('#step6FunctionBlock').val());
        }
        
        $('#step6ConfigModal').modal('hide');
        executeStep6WithConfig(config);
    });

});

// MIDI 2.0 Step Functions
function executeStep1() {
    console.log('=== executeStep1 called ===');
    showStepStatus('Step 1: Connect Devices', 'Connecting to MIDI devices and getting transport layer device descriptors...', 'info');
    
    // Trigger device discovery - this calls the existing functionality
    ipcRenderer.send('asynchronous-message', 'getMIDIDevices');
    
    // Also trigger UMP device discovery
    setTimeout(() => {
        ipcRenderer.send('asynchronous-message', 'getAllUMPDevicesFunctionBlocks');
    }, 1000);
    
    // Event-driven success/failure - only show success if UMP device is detected
    let step1Done = false;
    let devicesFound = [];
    let umpDevicesFound = [];
    let midi1DevicesFound = [];
    
    const step1Handler = (event, arg, xData) => {
        if(arg==='MIDIDevices'){
            // Track MIDI 1.0 devices (but don't show success yet - need UMP device)
            if(xData && (
                (xData.midiDevices && (xData.midiDevices.in.length > 0 || xData.midiDevices.out.length > 0)) ||
                (xData.serialDevices && xData.serialDevices.length > 0)
            )){
                if(xData.midiDevices){
                    if(xData.midiDevices.in && xData.midiDevices.in.length > 0){
                        xData.midiDevices.in.forEach(dev => {
                            const name = (typeof dev === 'object' && dev.inName) ? dev.inName : (typeof dev === 'string' ? dev : 'Unknown');
                            midi1DevicesFound.push(`IN: ${name}`);
                            devicesFound.push(`IN: ${name}`);
                        });
                    }
                    if(xData.midiDevices.out && xData.midiDevices.out.length > 0){
                        xData.midiDevices.out.forEach(dev => {
                            const name = (typeof dev === 'string') ? dev : (dev.name || 'Unknown');
                            midi1DevicesFound.push(`OUT: ${name}`);
                            devicesFound.push(`OUT: ${name}`);
                        });
                    }
                }
                if(xData.serialDevices && xData.serialDevices.length > 0){
                    xData.serialDevices.forEach(dev => {
                        midi1DevicesFound.push(`Serial: ${dev.name || dev}`);
                        devicesFound.push(`Serial: ${dev.name || dev}`);
                    });
                }
            }
        } else if(arg==='umpDev'){
            // UMP device found - this is what we need for success
            if(xData && xData.endpoint){
                const endpoint = xData.endpoint;
                const deviceInfo = [];
                if(endpoint.name) deviceInfo.push(`UMP Device: ${endpoint.name}`);
                if(endpoint.manufacturer) deviceInfo.push(`Manufacturer: ${endpoint.manufacturer}`);
                if(endpoint.model) deviceInfo.push(`Model: ${endpoint.model}`);
                if(endpoint.blocks && endpoint.blocks.length > 0){
                    deviceInfo.push(`${endpoint.blocks.length} Function Block(s)`);
                }
                // Add UMP device to the list
                if(xData.umpDev){
                    umpDevicesFound.push(endpoint.name || xData.umpDev);
                    devicesFound.push(`UMP: ${endpoint.name || xData.umpDev}`);
                }
                step1Done = true;
                const infoText = deviceInfo.length > 0 ? ` Retrieved: ${deviceInfo.join(', ')}` : '';
                showStepStatus('Step 1: Connect Devices', `Device connection completed! Transport layer device descriptors retrieved.${infoText}`, 'success');
                // Don't remove listener yet - might get more UMP devices
            }
        }
    };
    ipcRenderer.on('asynchronous-reply', step1Handler);
    setTimeout(() => {
        if(!step1Done){
            // No UMP device found
            if(midi1DevicesFound.length > 0){
                // MIDI 1.0 devices found but no UMP
                const deviceList = midi1DevicesFound.length > 0 ? ` Found: ${midi1DevicesFound.join(', ')}` : '';
                showStepStatus('Step 1: Connect Devices', `MIDI 1.0 devices detected but no USB MIDI 2.0 device found.${deviceList} MIDI 2.0 features require a USB MIDI 2.0 device.`, 'warning');
            } else {
                // No devices at all
                showStepStatus('Step 1: Connect Devices', 'No devices detected. Please check connections and try again.', 'danger');
            }
            ipcRenderer.removeListener('asynchronous-reply', step1Handler);
        } else {
            // UMP device found - show success
            const hasUMP = umpDevicesFound.length > 0;
            if(hasUMP){
                const deviceList = devicesFound.length > 0 ? ` Found: ${devicesFound.join(', ')}` : '';
                showStepStatus('Step 1: Connect Devices', `Device connection completed! Transport layer device descriptors retrieved.${deviceList}`, 'success');
            } else {
                // This shouldn't happen if step1Done is true, but just in case
                const deviceList = midi1DevicesFound.length > 0 ? ` Found: ${midi1DevicesFound.join(', ')}` : '';
                showStepStatus('Step 1: Connect Devices', `MIDI 1.0 devices detected but no USB MIDI 2.0 device found.${deviceList} MIDI 2.0 features require a USB MIDI 2.0 device.`, 'warning');
            }
            ipcRenderer.removeListener('asynchronous-reply', step1Handler);
        }
    }, 6000);
}

function executeStep2() {
    console.log('=== executeStep2 called ===');
    showStepStatus('Step 2: UMP Endpoint Discovery', 'Sending Endpoint Discovery (0x000) requesting Info, Identity, Name, and Product Instance Id notifications...', 'info');
    
    // Step 2: UMP Endpoint Discovery (per MIDI 2.0 spec)
    // Sends: Endpoint Discovery (0x000)
    // Receives: Endpoint Info Notification (0x1), Device Identity Notification (0x2),
    //           Endpoint Name Notification (0x3), Product Instance Id Notification (0x4)
    console.log('Sending IPC: triggerUMPEndpointDiscovery');
    ipcRenderer.send('asynchronous-message', 'triggerUMPEndpointDiscovery');
    
    // Handle errors
    const step2ErrorHandler = (event, arg, xData) => {
        if(arg === 'umpEndpointDiscoveryError'){
            const errorMsg = xData && xData.error ? xData.error : 'UMP Endpoint Discovery failed.';
            showStepStatus('Step 2: UMP Endpoint Discovery', errorMsg, 'danger');
            ipcRenderer.removeListener('asynchronous-reply', step2ErrorHandler);
        }
    };
    ipcRenderer.on('asynchronous-reply', step2ErrorHandler);
    setTimeout(() => {
        ipcRenderer.removeListener('asynchronous-reply', step2ErrorHandler);
    }, 1000);
    
    let step2Done = false;
    let endpointInfo = [];
    let blocksCached = false;
    const step2Handler = (event, arg, xData) => {
        if(arg==='umpEndpointBlocksCached'){
            blocksCached = true;
            console.log('Step 2: Blocks cached notification received', xData);
        }
        if(arg==='umpDev' && xData && xData.endpoint){
            const ep = xData.endpoint;
            const info = [];
            
            // Device identity
            if(ep.name) info.push(`Device: ${ep.name}`);
            if(ep.manufacturer) info.push(`Manufacturer: ${ep.manufacturer}`);
            if(ep.model) info.push(`Model: ${ep.model}`);
            
            // Version info
            if(ep.versionMajor !== undefined && ep.versionMinor !== undefined){
                info.push(`Version: ${ep.versionMajor}.${ep.versionMinor}`);
            }
            
            // Function blocks
            if(ep.blocks && ep.blocks.length > 0){
                const activeBlocks = ep.blocks.filter(fb => fb.active).length;
                info.push(`Function Blocks: ${ep.blocks.length} total (${activeBlocks} active)`);
                ep.blocks.forEach((fb, idx) => {
                    if(fb.active){
                        const fbInfo = `FB${fb.fbIdx || idx}: ${fb.name || 'Unnamed'}`;
                        if(fb.firstGroup !== undefined) info.push(`${fbInfo} (Groups ${fb.firstGroup+1}-${fb.firstGroup+fb.numberGroups})`);
                    }
                });
            }
            
            // MIDI 2.0 support
            if(ep.midi2Supp){
                const supp = [];
                if(ep.midi2Supp.transUSBMIDI2) supp.push('USB MIDI 2.0');
                if(Object.keys(ep.midi2Supp).length > 0){
                    info.push(`MIDI 2.0 Support: ${supp.join(', ') || 'Yes'}`);
                }
            }
            
            if(info.length > 0){
                endpointInfo.push(...info);
            }
            
            step2Done = true;
            const infoText = endpointInfo.length > 0 ? ` Retrieved: ${endpointInfo.join('; ')}` : '';
            showStepStatus('Step 2: UMP Endpoint Discovery', `UMP Endpoint Discovery completed! Device information and identities retrieved.${infoText}`, 'success');
            ipcRenderer.removeListener('asynchronous-reply', step2Handler);
        }
    };
    ipcRenderer.on('asynchronous-reply', step2Handler);
    setTimeout(() => {
        if(!step2Done){
            showStepStatus('Step 2: UMP Endpoint Discovery', 'No UMP endpoints discovered.', 'danger');
            ipcRenderer.removeListener('asynchronous-reply', step2Handler);
        }
    }, 6000);
}

function executeStep3() {
    console.log('=== executeStep3 called ===');
    showStepStatus('Step 3: Select Protocol', 'Selecting protocol and configuring stream...', 'info');
    
    // Trigger protocol negotiation for all discovered MIDI-CI devices
    console.log('Sending IPC: triggerProtocolNegotiation');
    ipcRenderer.send('asynchronous-message', 'triggerProtocolNegotiation');
    
    let step3Done = false;
    let protocolInfo = [];
    const step3Handler = (event, arg, xData) => {
        if(arg==='protocolNegotiationComplete'){
            const info = [];
            if(xData){
                // Handle multiple protocol negotiations (one per MUID)
                if(xData.protocols && Array.isArray(xData.protocols)){
                    xData.protocols.forEach(proto => {
                        const protoInfo = [];
                        if(proto.muid){
                            protoInfo.push(`MUID: 0x${parseInt(proto.muid).toString(16).toUpperCase().padStart(8,'0')}`);
                        }
                        if(proto.protocols && proto.protocols.length > 0){
                            protoInfo.push(`Supported: ${proto.protocols.join(', ')}`);
                        }
                        if(proto.currentProtocol){
                            protoInfo.push(`Established: ${proto.currentProtocol}`);
                        }
                        if(proto.streamConfig){
                            protoInfo.push(`Stream: ${proto.streamConfig.protocol}${proto.streamConfig.jrTimestamps ? ' + JR' : ''}`);
                        }
                        if(protoInfo.length > 0){
                            info.push(protoInfo.join('; '));
                        }
                    });
                } else {
                    // Legacy format
                    if(xData.protocols && xData.protocols.length > 0){
                        info.push(`Supported: ${xData.protocols.join(', ')}`);
                    }
                    if(xData.currentProtocol){
                        info.push(`Established: ${xData.currentProtocol}`);
                    }
                    if(xData.muid){
                        info.push(`MUID: 0x${xData.muid.toString(16).toUpperCase().padStart(8,'0')}`);
                    }
                }
                if(xData.streamConfig){
                    info.push(`Stream Configuration: ${xData.streamConfig.protocol}${xData.streamConfig.jrTimestamps === 'ON' ? ' + JR Timestamps' : ''}`);
                }
            }
            if(info.length > 0){
                protocolInfo.push(...info);
            }
            step3Done = true;
            const infoText = protocolInfo.length > 0 ? ` Montage Reply: ${protocolInfo.join(' | ')}` : '';
            showStepStatus('Step 3: Select Protocol', `Protocol negotiation completed!${infoText}`, 'success');
            ipcRenderer.removeListener('asynchronous-reply', step3Handler);
        } else if(arg==='umpEndpointBlocksCached'){
            // Blocks were cached from Step 2 - this is good for Step 5
            console.log('Step 2: Received blocks cached notification', xData);
        }
        if(arg==='protocolNegotiationError'){
            const errorMsg = xData && xData.error ? xData.error : 'Protocol negotiation failed.';
            showStepStatus('Step 3: Select Protocol', errorMsg, 'danger');
            step3Done = true;
            ipcRenderer.removeListener('asynchronous-reply', step3Handler);
        }
    };
    ipcRenderer.on('asynchronous-reply', step3Handler);
    setTimeout(()=>{
        if(!step3Done){
            showStepStatus('Step 3: Select Protocol', 'No devices completed protocol negotiation.', 'danger');
            ipcRenderer.removeListener('asynchronous-reply', step3Handler);
        }
    }, 8000);
}

function executeStep4() {
    console.log('=== executeStep4 called ===');
    showStepStatus('Step 4: Function Blocks Discovery', 'Sending Function Block Discovery (0x010) to get Function Block Info and Name notifications...', 'info');
    
    // Step 4: Function Blocks Discovery (per MIDI 2.0 spec)
    // Sends: Function Block Discovery (0x010)
    // Receives: Function Block Info Notification (0x11), Function Block Name Notification (0x012)
    console.log('Sending IPC: triggerFunctionBlockDiscovery');
    
    // Remove any existing handler first to prevent duplicates
    if(window._step4Handler){
        ipcRenderer.removeListener('asynchronous-reply', window._step4Handler);
    }
    
    // Track processed function blocks to avoid duplicates (device + fbIdx as key)
    const processedBlocks = new Set();
    let fbInfo = [];
    
    window._step4Handler = (event, arg, xData) => {
        if(arg==='umpDev' && xData && xData.endpoint && xData.endpoint.blocks){
            const blocks = xData.endpoint.blocks;
            const umpDev = xData.umpDev || 'unknown';
            blocks.forEach(fb => {
                if(fb.active){
                    // Create unique key for this function block
                    const blockKey = `${umpDev}:FB${fb.fbIdx}`;
                    // Only process if we haven't seen this block before
                    if(!processedBlocks.has(blockKey)){
                        processedBlocks.add(blockKey);
                        const details = [];
                        details.push(`FB${fb.fbIdx}: ${fb.name || 'Unnamed'}`);
                        if(fb.firstGroup !== undefined) details.push(`Groups ${fb.firstGroup+1}-${fb.firstGroup+fb.numberGroups}`);
                        if(fb.direction !== undefined){
                            const dirs = [];
                            if(fb.direction & 0b01) dirs.push('IN');
                            if(fb.direction & 0b10) dirs.push('OUT');
                            if(dirs.length > 0) details.push(`Direction: ${dirs.join('/')}`);
                        }
                        if(fb.ciVersion !== undefined) details.push(`CI v${fb.ciVersion}`);
                        if(fb.isMIDI1 !== undefined) details.push(fb.isMIDI1 ? 'MIDI 1.0' : 'MIDI 2.0');
                        fbInfo.push(details.join(', '));
                    }
                }
            });
        }
    };
    ipcRenderer.on('asynchronous-reply', window._step4Handler);
    
    // Send the discovery request
    ipcRenderer.send('asynchronous-message', 'triggerFunctionBlockDiscovery');
    
    setTimeout(() => {
        const hasFB = $('.funcBlock').length > 0;
        if(hasFB){
            const infoText = fbInfo.length > 0 ? ` Retrieved: ${fbInfo.join('; ')}` : '';
            showStepStatus('Step 4: Function Blocks Discovery', `Function blocks discovery completed! All function block information retrieved.${infoText}`, 'success');
        }else{
            showStepStatus('Step 4: Function Blocks Discovery', 'No Function Blocks found.', 'danger');
        }
        ipcRenderer.removeListener('asynchronous-reply', window._step4Handler);
        window._step4Handler = null;
    }, 6000);
}

function executeStep5() {
    console.log('=== executeStep5 called ===');
    showStepStatus('Step 5: MIDI-CI Discovery', 'Performing MIDI-CI Discovery and establishing connections...', 'info');
    
    // Step 5: Send MIDI-CI discovery messages and wait for replies
    console.log('Sending IPC: triggerMIDICIDiscovery');
    ipcRenderer.send('asynchronous-message', 'triggerMIDICIDiscovery');
    
    let step5Done = false;
    const step5Handler = (event, arg, xData) => {
        if(arg === 'midiciDiscoveryComplete'){
            // Discovery replies were received - devices are in remoteDevices
            const muidInfo = [];
            if(xData && xData.muids){
                xData.muids.forEach(m => {
                    const muidHex = '0x' + parseInt(m.muid).toString(16).toUpperCase().padStart(8,'0');
                    muidInfo.push(`MUID: ${muidHex} (Group ${m.group})`);
                });
            }
            const infoText = muidInfo.length > 0 ? ` Discovered: ${muidInfo.join('; ')}` : ` Discovered ${xData.count || 0} MIDI-CI device(s)`;
            showStepStatus('Step 5: MIDI-CI Discovery', `MIDI-CI Discovery completed! All MIDI-CI devices identified and connected.${infoText}`, 'success');
            step5Done = true;
            ipcRenderer.removeListener('asynchronous-reply', step5Handler);
        } else if(arg === 'midiciDiscoveryError'){
            const errorMsg = xData && xData.error ? xData.error : 'MIDI-CI discovery failed.';
            showStepStatus('Step 5: MIDI-CI Discovery', errorMsg, 'danger');
            step5Done = true;
            ipcRenderer.removeListener('asynchronous-reply', step5Handler);
        }
    };
    ipcRenderer.on('asynchronous-reply', step5Handler);
    
    setTimeout(()=>{
        ipcRenderer.removeListener('asynchronous-reply', step5Handler);
        if(!step5Done){
            showStepStatus('Step 5: MIDI-CI Discovery', 'No MIDI-CI devices discovered. Make sure Step 2 completed successfully and the device supports MIDI-CI.', 'danger');
        }
    }, 10000); // Wait 10 seconds total for discovery replies
}

function executeStep6() {
    // Show configuration modal for button 6
    $('#step6ConfigModal').modal('show');
}

function executeStep7() {
    showStepStatus('Step 7: Use MIDI', 'Sending/receiving MIDI… waiting for activity.', 'info');
    
    let activity = false;
    const activityHandler = (event, arg, xData) => {
        if(arg==='inUMP' || arg==='controlUpdate'){
            activity = true;
            showStepStatus('Step 7: Use MIDI', 'MIDI traffic detected. You are ready to use System/Channel Voice messages.', 'success');
            ipcRenderer.removeListener('asynchronous-reply', activityHandler);
        }
    };
    ipcRenderer.on('asynchronous-reply', activityHandler);
    
    // If no traffic within 8s, show warning
    setTimeout(()=>{
        if(!activity){
            showStepStatus('Step 7: Use MIDI', 'No MIDI traffic detected yet. Try sending a note or system message.', 'warning');
            ipcRenderer.removeListener('asynchronous-reply', activityHandler);
        }
    }, 8000);
}

function executeStep6WithConfig(config) {
    showStepStatus('Step 6: Use MIDI-CI', 'Sending Profile Configuration, Property Exchange, and Process Inquiry messages...', 'info');
    
    // Step 6: Use MIDI-CI (per MIDI 2.0 spec)
    // Sends: Profile Configuration Messages, Property Exchange Messages, Process Inquiry Messages
    // Receives: Supported Profiles, Supported PE Resources, Device parameter states
    console.log('=== executeStep6WithConfig called ===', config);
    ipcRenderer.send('asynchronous-message', 'activateMIDICIFeaturesWithConfig', config);
    
    let step6Done = false;
    let featuresActivated = [];
    const step6Handler = (event, arg, xData) => {
        if(arg==='midiciFeaturesActivated' && xData && xData.features){
            featuresActivated = xData.features;
        } else if(arg==='midiciFeaturesError'){
            const errorMsg = xData && xData.error ? xData.error : 'MIDI-CI features activation failed.';
            showStepStatus('Step 6: Use MIDI-CI', errorMsg, 'danger');
            step6Done = true;
            ipcRenderer.removeListener('asynchronous-reply', step6Handler);
            return;
        }
        // Profile Configuration responses
        if(arg==='settings'){
            if(!step6Done){
                step6Done = true;
                const targetInfo = config.type === 'channel' ? `Group ${config.group}, Channel ${config.channel}` :
                                  config.type === 'group' ? `Group ${config.group}` :
                                  config.type === 'functionBlock' ? `Function Block ${config.functionBlock}` : 'All devices';
                const featuresText = featuresActivated.length > 0 ? ` Retrieved: ${featuresActivated.join('; ')}` : ' Profile Configuration: Supported Profiles retrieved';
                showStepStatus('Step 6: Use MIDI-CI', `MIDI-CI features activated for ${targetInfo}.${featuresText}`, 'success');
                ipcRenderer.removeListener('asynchronous-reply', step6Handler);
            }
        }
        // Property Exchange responses
        if(['updatePE','peSubUpdate','CtrlListInfo'].includes(arg)){
            if(!step6Done){
                step6Done = true;
                const targetInfo = config.type === 'channel' ? `Group ${config.group}, Channel ${config.channel}` :
                                  config.type === 'group' ? `Group ${config.group}` :
                                  config.type === 'functionBlock' ? `Function Block ${config.functionBlock}` : 'All devices';
                const featuresText = featuresActivated.length > 0 ? ` Retrieved: ${featuresActivated.join('; ')}` : ' Property Exchange: Supported PE Resources retrieved';
                showStepStatus('Step 6: Use MIDI-CI', `MIDI-CI features activated for ${targetInfo}.${featuresText}`, 'success');
                ipcRenderer.removeListener('asynchronous-reply', step6Handler);
            }
        }
        // Process Inquiry responses
        if(arg==='MIDIReportMessage'){
            if(!step6Done){
                step6Done = true;
                const targetInfo = config.type === 'channel' ? `Group ${config.group}, Channel ${config.channel}` :
                                  config.type === 'group' ? `Group ${config.group}` :
                                  config.type === 'functionBlock' ? `Function Block ${config.functionBlock}` : 'All devices';
                const featuresText = featuresActivated.length > 0 ? ` Retrieved: ${featuresActivated.join('; ')}` : ' Process Inquiry: Device parameter states retrieved';
                showStepStatus('Step 6: Use MIDI-CI', `MIDI-CI features activated for ${targetInfo}.${featuresText}`, 'success');
                ipcRenderer.removeListener('asynchronous-reply', step6Handler);
            }
        }
    };
    ipcRenderer.on('asynchronous-reply', step6Handler);
    setTimeout(()=>{
        if(!step6Done){
            const targetInfo = config.type === 'channel' ? `Group ${config.group}, Channel ${config.channel}` :
                              config.type === 'group' ? `Group ${config.group}` :
                              config.type === 'functionBlock' ? `Function Block ${config.functionBlock}` : 'All devices';
            const featuresText = featuresActivated.length > 0 ? ` Attempted: ${featuresActivated.join('; ')}` : '';
            showStepStatus('Step 6: Use MIDI-CI', `No responses received from MIDI-CI features for ${targetInfo}.${featuresText} Make sure Step 5 completed successfully.`, 'warning');
            ipcRenderer.removeListener('asynchronous-reply', step6Handler);
        }
    }, 8000);
}

function showStepStatus(title, message, type) {
    const statusDiv = $('#stepStatus');
    const contentDiv = $('#stepStatusContent');
    
    // Update content
    contentDiv.html(`
        <strong>${title}</strong><br>
        ${message}
    `);
    
    // Update styling based on type
    statusDiv.removeClass('alert-info alert-success alert-warning alert-danger');
    statusDiv.addClass(`alert-${type}`);
    
    // Show the status
    statusDiv.show();
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.fadeOut();
        }, 5000);
    }
}

function buildMIDICIDevice(jqCard, xData){

    let jqGrEntry = jqCard.find('[data-muid="'+xData.muidRemote+'"]');
    if(jqGrEntry.length){
        return;
    }

    const jqMUID = $('<button/>',{"class": 'btn','data-muid': xData.muidRemote})
        .addClass(jqCard.data()['ismidi1']?'btn-info':'btn-success')
        .data('xData', xData)
        .append('MUID : ' + xData.muidRemote)
        .appendTo(jqCard)
        .on('click', e => {
            let umpDev = jqCard.parent().parent().data()['umpdev'];
            if(configSetting.bridging.indexOf(umpDev)!==-1){
                common.buildModalAlert("Cannot open MIDI-CI view when bridging is active");
            }else {
                const xData = $(e.currentTarget).data('xData');
                ipcRenderer.send('asynchronous-message', 'openMIDICI',
                    {
                        umpDev,
                        fbIdx: jqCard.data()['fbIdx'],
                        muid: xData.muidRemote,
                        group: jqCard.data()['groupstart'],
                        //funcBlock: xData.funcBlock
                    }
                );
            }
        });


    let sup = [];
    if(xData.supported){
        if (xData.supported.protocol) {
            sup.push('Protocol Negotiation');
        }
        if (xData.supported.profile) {
            sup.push('Profile Configuration');
        }
        if (xData.supported.pe) {
            sup.push('Property Exchange');
        }
        if (xData.supported.procInq) {
            sup.push('Process Inquiry');
        }
    }

    $('<div/>',{class:'small',style:"line-height: 0.8;"}).append(sup.join('<br/>')).appendTo(jqMUID);

}


function buildUMPDevice(){




    ipcRenderer.send('asynchronous-message', 'refreshMIDIDevices');
}

function createUMPCard(umpDev){
    const jqMidiCiDevices = $('#umpDevices');
    let jqCard = $('[data-umpDev="' + umpDev + '"]');
    if (!jqCard.length) {
        jqCard = $('<div/>', {
            "class": 'card ml-3',
            'data-umpDev': umpDev
        }).appendTo(jqMidiCiDevices);
        $('<div/>', {"class": 'card-header p-3 '})
            .css({padding: 0})
            // .append('<h3>' + xData.midiOutName + '</h3>')
            // .append('<h4>Initiator MUID: ' + xData.midiOutMuid + '</h4>')
            .appendTo(jqCard);
        const jqBody = $('<div/>', {"class": 'card-body'})
            .css({
                display: 'grid',
                'grid-template-columns': '30px auto',
                'grid-template-rows': 'repeat(16, auto)',
                'grid-column-gap': '2px',
                'grid-row-gap': '2px'
            })
            .appendTo(jqCard);
        $('<div/>', {})
            .css({
                'grid-area': '1/1/1/1',
                margin: 'auto'
            }).text(umpDev.match(/umpVirtualMIDI/)?'Port':"Grp.")
            .appendTo(jqBody);

        if(!umpDev.match(/umpVirtualMIDI/)){
            $('<div/>', {})
                .css({
                    'grid-area': '1/2/1/26',
                    margin: 'auto'
                }).text("Blocks")
                .appendTo(jqBody);
        }
        for(let i=1; i<17;i+=1){
            $('<div/>', {})
                .css({
                    'grid-area': (i+1) +'/1/' + (i+1) +'/16',
                    'border-bottom': '1px dashed #ddd',
                    transform: 'translate3d(0, 2px, 0)',
                    'z-index': 1
                })
                .appendTo(jqBody);
        }
        for(let i=1; i<17;i++){
            $('<div/>', {})
                .css({
                    'grid-area': (i+1) +'/1/' + (i+1) +'/1',
                    margin: 'auto'
                }).text(i)
                .appendTo(jqBody);
        }

    }
}
function addUMPDevHead(umpDev,info){
    let jqCardHead = $('[data-umpDev="' + umpDev + '"] > .card-header').empty();

    if(!umpDev.match(/umpVirtualMIDI/)){
        const jqntitle = $('<b/>').appendTo(jqCardHead);
        $('<button/>',{type:"button"})
            .addClass("btn btn-success btn-sm w-100 pt-0 pb-0")
            .append(info.name)
            .appendTo(jqntitle)
            .on('click', e => {
                if(configSetting.bridging.indexOf(umpDev)!==-1){
                    common.buildModalAlert("Cannot open device view when bridging is active");
                }else {
                    ipcRenderer.send('asynchronous-message', 'openMIDIEndpoint',
                        {
                            umpDev,
                            remoteEndpoint: true,
                            umpStream: true
                        }
                    );
                }
            });
    }

    if(umpDev.match(/umpVirtualMIDI/)){
        jqCardHead.append('<b>' + info.name + '</b>');
        jqCardHead.append('<br/>');
        const jqsub = $('<sub/>').appendTo(jqCardHead);
        const jqConfigur = $('<a/>',{href:'#'})
            .text('Configure')
            .on('click',()=>{

                $('#midi1DevicesList').empty();

                window.configSetting[umpDev].map((vm1,idx)=>{
                    const jqSelIn = $("<select/>",{class:'deviceIn form-control','data-path':`/config/${umpDev}/${idx}/in`})
                        .append(
                            '<option value="">-- Select a MIDI IN connection --</option>'
                        );
                    const jqSelOut = $("<select/>",{class:'deviceOut form-control','data-path':`/config/${umpDev}/${idx}/out`})
                        .append(
                            '<option value="">-- Select a MIDI Out connection --</option>'
                        );

                    window.m1Devices.in.map(o=>{
                        $('<option/>',{value:o.inName})
                            .text(o.inName).appendTo(jqSelIn);
                    });
                    window.m1Devices.out.map(name=>{
                        $('<option/>',{value:name} )
                            .text(name).appendTo(jqSelOut);
                    });

                    const jqRow = $('<tr/>').appendTo('#midi1DevicesList');
                    const jqGRIn = $('<input/>',{type:"number", min:1, max:16,'data-path':`/config/${umpDev}/${idx}/group`,value:vm1.group,'data-zerobased':true})
                        .data('idx',idx)
                        .data('vm1',vm1)
                        .data('umpDev',umpDev)
                        .on('change.checkGroup',function(e){
                            const idx = $(this).data('idx');
                            const umpDev = $(this).data('umpDev');
                            const newValue = parseInt($(this).val()) - 1;
                            const groupsInUse = window.configSetting[umpDev]
                                .filter((v,i)=>i!==idx).map(v=>v.group);
                            if(~groupsInUse.indexOf(newValue)){
                                e.preventDefault();
                                e.stopPropagation();
                                $(this).val(newValue+1).trigger('change');
                            }else{
                                $(this).trigger('change.datapath');

                                ipcRenderer.send('asynchronous-message', 'getAllUMPDevicesFunctionBlocks',{resetMUID:true});
                            }
                        });

                    const jqGRName = $('<input/>',
                        {'data-path':`/config/${umpDev}/${idx}/name`,value:vm1.name});


                    const jqButtonRem = $("<button/>",{type:"button", class:"btn btn-primary"})
                        .append('<i class="fas fa-trash"></i>')
                        .data('idx',idx)
                        .on('click',function(){
                            window.configSetting[umpDev].splice($(this).data('idx'),1);
                            common.setConfig(`/${umpDev}`, window.configSetting[umpDev]);
                            jqConfigur.trigger('click');
                        });

                    $('<td/>')
                        .append(jqGRIn)
                        .appendTo(jqRow);
                    $('<td/>')
                        .append(jqGRName)
                        .appendTo(jqRow);
                    $('<td/>')
                        .append(jqSelIn)
                        .appendTo(jqRow);
                    $('<td/>')
                        .append(jqSelOut)
                        .appendTo(jqRow);
                    $('<td/>')
                        .append(jqButtonRem)
                        .appendTo(jqRow);
                });

                const jqRowAdd = $('<tr/>').appendTo('#midi1DevicesList');
                const jqButtonAdd = $("<button/>",{type:"button", class:"btn btn-primary"})
                    .append('<i class="fas fa-plus"></i> Add MIDI 1.0 Device')
                    .on('click',function(){
                        window.configSetting[umpDev].push({group:0});
                        common.setConfig('/'+umpDev, window.configSetting[umpDev]);
                        jqConfigur.trigger('click');
                    });
                $('<td/>',{colspan:3})
                    .append(jqButtonAdd)
                    .appendTo(jqRowAdd);

                const jqButtonRefresh = $("<button/>",{type:"button", class:"btn btn-secondary"})
                    .append('Refresh list of available MIDI 1.0 In/Out')
                    .on('click',function(){
                        ipcRenderer.send('asynchronous-message', 'getMIDIDevices');
                    });
                $('<td/>',{colspan:2, align:'right'})
                    .append(jqButtonRefresh)
                    .appendTo(jqRowAdd);

                common.setValues();
                common.setValueOnChange();
                common.updateView();

                $('#m1Modal')
                    .modal({show:true})
                    .on('hidden.bs.modal', function (e) {
                        $('#m1Modal').modal('dispose');

                    });
            })
            .appendTo(jqsub);
        jqsub.append('  and set-up MIDI 1.0 Devices here.')

    }else if(info.extraText){
        jqCardHead.append('<br/><sub>' + info.extraText + '</sub>');
    }



    $('<a/>',{href:'#'})
        .css({position: 'absolute', bottom: '5px', left:'5px', fontSize:'0.8em'})
        .text('Bridge '+ (configSetting.bridging.indexOf(umpDev)!==-1?`Off`:'On'))
        .on('click',function(){
            if(configSetting.bridging.indexOf(umpDev)!==-1){
                $(this).text('Bridge On');
                ipcRenderer.send('asynchronous-message', 'removeMIDI2Bridge', umpDev );
            }else{
                $(this).text('Bridge Off');
                ipcRenderer.send('asynchronous-message', 'addMIDI2Bridge', umpDev );
            }
        })
        .appendTo(jqCardHead);

}
function addUMPDevFBs(umpDev,FBList){
    let jqBody = $('[data-umpDev="' + umpDev + '"]').find('.card-body');
    jqBody.find('.funcBlock').remove();

    FBList.map((fb,idx)=>{
        let gridPos = 2;
        FBList.slice(0,idx).map((fbo)=>{
            if((fbo.firstGroup) <=  (fb.firstGroup + fb.numberGroups-1)
                && (fbo.firstGroup + fbo.numberGroups-1) >= fb.firstGroup){
                gridPos++;
            }
        });
        const jqFB = $('<div/>', {
                "class": 'border rounded p-1 funcBlock',
//                'data-idx': idx,
                'data-isMIDI1':fb.isMIDI1,
                'data-fbIdx':fb.fbIdx,
                'data-groupStart':fb.firstGroup
            })
            .css({
                'grid-area': (fb.firstGroup +2) +'/'+gridPos+'/' + (fb.firstGroup +2 + fb.numberGroups ) +'/' + (gridPos+1),
                'z-index': 4
            })
            .addClass('border-warning')
            .appendTo(jqBody)
        ;
        if(!fb.active){
            jqFB.css('opacity',0.3);
        }

        const jqName = $('<div/>',{class:'fbName'}).append(fb.name).appendTo(jqFB);
        $('<span/>',{class:'fa fa-sync fa-xs',style:'float:right; opacity:0.6'})
            .appendTo(jqName)
            .on('click',(e)=>{
                if(configSetting.bridging.indexOf(umpDev)!==-1){
                    common.buildModalAlert("Cannot refresh details when bridging is active");
                }else {
                    $(e.currentTarget).closest('.funcBlock').find("[data-muid]").remove();
                    $(e.currentTarget).addClass('fa-spin');

                    ipcRenderer.send('asynchronous-message', 'refreshMIDICI',
                        {
                            umpDev: umpDev,
                            group: jqFB.data()['groupstart'],
                            //funcBlock: xData.funcBlock
                        }
                    );
                    setTimeout(() => {
                        $(e.currentTarget).removeClass('fa-spin');
                    }, 1000)
                }
            });

        Object.keys(fb.muids||{}).map(muid=>{
            buildMIDICIDevice(jqFB, fb.muids[muid]);
        });
    });
}

// MT3 Packet Sender Functions
function updateMT3DeviceDropdown() {
    const $select = $('#mt3DeviceSelect');
    $select.empty();
    
    const devices = window.mt3AvailableDevices || [];
    if (devices.length === 0) {
        $select.append('<option value="">No devices available</option>');
        return;
    }
    
    devices.forEach(umpDev => {
        // Try to get device name from the card
        const $card = $('[data-umpDev="' + umpDev + '"]');
        let deviceName = umpDev;
        if ($card.length) {
            const $header = $card.find('.card-header');
            if ($header.length) {
                const nameText = $header.text().trim();
                if (nameText) {
                    deviceName = nameText.split('\n')[0]; // Get first line
                }
            }
        }
        $select.append(`<option value="${umpDev}">${deviceName}</option>`);
    });
    
    // Select first device by default if none selected
    if (!$select.val() && devices.length > 0) {
        $select.val(devices[0]);
    }
}

function parseHexInput(hexString, validateSysEx = true) {
    // Remove whitespace, newlines, and common separators
    const cleaned = hexString.replace(/[\s\n\r,;:]/g, '');
    
    // Validate hex string (must be even length and only hex characters)
    if (cleaned.length % 2 !== 0) {
        throw new Error('Hex string must have even number of characters');
    }
    if (!/^[0-9A-Fa-f]*$/.test(cleaned)) {
        throw new Error('Invalid hex characters found');
    }
    
    // Convert to byte array
    const bytes = [];
    for (let i = 0; i < cleaned.length; i += 2) {
        bytes.push(parseInt(cleaned.substr(i, 2), 16));
    }
    
    // SysEx validation
    if (validateSysEx && bytes.length > 0) {
        // Check if it looks like SysEx (starts with F0, ends with F7)
        if (bytes[0] === 0xF0 && bytes[bytes.length - 1] !== 0xF7) {
            throw new Error('SysEx message must end with F7');
        }
        if (bytes[0] !== 0xF0 && bytes.length > 0) {
            // Warn but don't error - user might want to send non-SysEx data
            console.warn('Input does not start with F0 (SysEx start). This may not be valid SysEx data.');
        }
        if (bytes.length < 2) {
            throw new Error('SysEx message too short (minimum F0 F7)');
        }
    }
    
    return bytes;
}

function convertBytesToMT3Packets(bytes, group = 0) {
    // Convert byte array to MT3 (Message Type 3) UMP packets
    // MT3 is 64-bit (2 x 32-bit words) for System Exclusive messages
    const umpPackets = [];
    
    if (bytes.length === 0) {
        return umpPackets;
    }
    
    // Process bytes in chunks of 6 (max data bytes per MT3 packet)
    let i = 0;
    let isFirstPacket = true;
    
    while (i < bytes.length) {
        const remainingBytes = bytes.length - i;
        const bytesInThisPacket = Math.min(remainingBytes, 6);
        
        // Word 1: MT3 header
        let word1 = ((0x03 << 4) + group) << 24; // Message Type 3 + Group
        
        // Determine status:
        // 0x0 = Complete message in one packet
        // 0x1 = Start packet
        // 0x2 = Continue packet  
        // 0x3 = End packet
        let status = 0;
        if (bytes.length <= 6) {
            status = 0; // Complete in one packet
        } else if (isFirstPacket) {
            status = 1; // Start
        } else if (i + bytesInThisPacket >= bytes.length) {
            status = 3; // End
        } else {
            status = 2; // Continue
        }
        
        word1 += (status << 20); // Status in bits 20-23
        word1 += (bytesInThisPacket << 16); // Number of bytes in bits 16-19
        
        // Add first 2 data bytes to word1
        if (bytesInThisPacket > 0) {
            word1 += (bytes[i] << 8);
        }
        if (bytesInThisPacket > 1) {
            word1 += bytes[i + 1];
        }
        
        // Word 2: Remaining 4 data bytes
        let word2 = 0;
        if (bytesInThisPacket > 2) {
            word2 += (bytes[i + 2] << 24);
        }
        if (bytesInThisPacket > 3) {
            word2 += (bytes[i + 3] << 16);
        }
        if (bytesInThisPacket > 4) {
            word2 += (bytes[i + 4] << 8);
        }
        if (bytesInThisPacket > 5) {
            word2 += bytes[i + 5];
        }
        
        umpPackets.push(word1);
        umpPackets.push(word2);
        
        i += bytesInThisPacket;
        isFirstPacket = false;
    }
    
    return umpPackets;
}

function sendMT3Packets() {
    try {
        // Get hex input
        const hexInput = $('#mt3HexInput').val().trim();
        if (!hexInput) {
            common.buildModalAlert('Please enter hex values to send', 'warning');
            return;
        }
        
        // Get selected device
        const umpDev = $('#mt3DeviceSelect').val();
        if (!umpDev) {
            common.buildModalAlert('Please select a MIDI 2.0 device', 'warning');
            return;
        }
        
        // Get selected group
        const group = parseInt($('#mt3GroupSelect').val(), 10);
        if (isNaN(group) || group < 0 || group > 15) {
            common.buildModalAlert('Invalid group selected', 'error');
            return;
        }
        
        // Parse hex to bytes (with SysEx validation)
        let bytes;
        try {
            bytes = parseHexInput(hexInput, true);
        } catch (e) {
            common.buildModalAlert('Error parsing hex: ' + e.message, 'error');
            return;
        }
        
        if (bytes.length === 0) {
            common.buildModalAlert('No valid hex data found', 'warning');
            return;
        }
        
        // Convert bytes to MT3 packets
        const umpPackets = convertBytesToMT3Packets(bytes, group);
        
        if (umpPackets.length === 0) {
            common.buildModalAlert('Failed to convert hex to MT3 packets', 'error');
            return;
        }
        
        // Send via IPC
        ipcRenderer.send('asynchronous-message', 'sendUMP', {
            umpDev: umpDev,
            ump: umpPackets
        });
        
        // Get device name for display
        const deviceName = $('#mt3DeviceSelect option:selected').text();
        
        // Show success message
        common.buildModalAlert(`Sent ${bytes.length} bytes as ${umpPackets.length / 2} MT3 packet(s) to ${deviceName} (Group ${group})`, 'success');
        
    } catch (e) {
        console.error('Error sending MT3 packets:', e);
        common.buildModalAlert('Error sending MT3 packets: ' + e.message, 'error');
    }
}
