const getEl = (id) => document.getElementById(id)
const listen = (node, type, callback) => node.addEventListener(type, callback)
const attachDevice = (deviceId) => navigator.mediaDevices.getUserMedia({ video: { deviceId } })
const streamToVideo = (node, stream) => node.srcObject = stream

const $Acall = getEl('A-call-btn')
const $AhangUp = getEl('A-hang-up-btn')
const $Bcall = getEl('B-call-btn')
const $BhangUp = getEl('B-hang-up-btn')
const $AlocalVideo = getEl('A-local-video')
const $AremoteVideo = getEl('A-remote-video')
const $BlocalVideo = getEl('B-local-video')
const $BremoteVideo = getEl('B-remote-video')
const $ADeviceList = getEl('A-device-list')
const $BDeviceList = getEl('B-device-list')
const $AReplaceStream = getEl('A-replace-stream')
const $BReplaceTrack = getEl('B-replace-track');
let AOfferPc = new RTCPeerConnection(null);
let AAnswerPc = new RTCPeerConnection(null);
let BOfferPc = new RTCPeerConnection(null);
let BAnswerPc = new RTCPeerConnection(null);

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

const setRemoteDescription = (pc, desc) => pc.setRemoteDescription(desc)
  .then(() => console.log('setRemoteDescription success'), (e) => console.error('setRemoteDescription', e))
const setLocalDescription = (pc, desc) => pc.setLocalDescription(desc)
  .then(() => console.log('setLocalDescription success'), (e) => console.error('setLocalDescription', e))
const onIceCandidate = (pc, e) => {
  console.log('onIceCandidate', e)
};
const onIceStateChange = (pc, e) => {
  console.log('onIceStateChange', e)
};
const onSetRemoteDescription = (e) => {
  console.log('onSetRemoteDescription', e)
};
const onCreateOfferSuccess = (pc, desc) => {
  console.log('create offer success', pc, desc)
  pc.setLocalDescription(desc)
  return desc
};
const onCreateSessionDescriptionError = (...args) => console.error(...args);

[$ADeviceList, $BDeviceList].forEach((el, index) => {
  const onSelectChange = (element, deviceId) => {
    return attachDevice(deviceId)
      .then(stream => {
        streamToVideo(element, stream)
        return stream
      })
  }
  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      el.innerHTML += devices.filter(device => device.kind === 'videoinput')
        .map(device => `<option value="${device.deviceId}">${device.label}</option>`).join('\n')
    })
    .then(() => {
      el.value = el.children[Math.floor(Math.random() * el.childElementCount)].value
      onSelectChange([$AlocalVideo, $BlocalVideo][index], el.value)
    })

  listen(el, 'change', (e) => {
    onSelectChange([$AlocalVideo, $BlocalVideo][index], e.target.value)
      .then((stream) => {
        if (el === $ADeviceList) {
          replaceStream(stream)
        } else if (el === $BDeviceList) {
          replaceTrack(stream)
        }
      })
  })
})

listen($Acall, 'click', function () {
  if ($Acall.disabled) return
  $Acall.disabled = true
  pc = AOfferPc
  pc.addStream($AlocalVideo.srcObject)
  pc.onicecandidate = e => {
    BAnswerPc.addIceCandidate(e.candidate);
  }
  pc.oniceconnectionstatechange = e => onIceStateChange(pc, e);
  pc.createOffer(offerOptions)
    .then((desc) => {
      setLocalDescription(pc, desc)
      setRemoteDescription(BAnswerPc, desc);
      BAnswerPc.createAnswer()
        .then(desc => {
          setLocalDescription(BAnswerPc, desc)
          setRemoteDescription(pc, desc)
          $AhangUp.disabled = false
        })
    }, onCreateSessionDescriptionError)
  BAnswerPc.ontrack = function (e) {
    console.log('ontrack', e)
    $AremoteVideo.srcObject = e.streams[0]
  }
})
listen($Bcall, 'click', function () {
  if ($Bcall.disabled) return
  $Bcall.disabled = true
  pc = BOfferPc
  $BlocalVideo.srcObject.getTracks().forEach(track => pc.addTrack(track, $BlocalVideo.srcObject));
  pc.onicecandidate = e => {
    AAnswerPc.addIceCandidate(e.candidate);
  }
  pc.oniceconnectionstatechange = e => onIceStateChange(pc, e);
  pc.createOffer(offerOptions)
    .then((desc) => {
      setLocalDescription(pc, desc)
      setRemoteDescription(AAnswerPc, desc);
      AAnswerPc.createAnswer()
        .then(desc => {
          setLocalDescription(AAnswerPc, desc)
          setRemoteDescription(pc, desc)
          $BhangUp.disabled = false
        })
    }, onCreateSessionDescriptionError);
  AAnswerPc.ontrack = function (e) {
    $BremoteVideo.srcObject = e.streams[0]
  }
})

listen($AhangUp, 'click', () => {
  if ($AhangUp.disabled) return
  $AhangUp.disabled = true
  AOfferPc.close()
  BAnswerPc.close()
  AOfferPc = new RTCPeerConnection(null)
  BAnswerPc = new RTCPeerConnection(null)
  $Acall.disabled = false
})
listen($BhangUp, 'click', () => {
  if ($BhangUp.disabled) return
  $BhangUp.disabled = true
  AAnswerPc.close()
  BOfferPc.close()
  AAnswerPc = new RTCPeerConnection(null)
  BOfferPc = new RTCPeerConnection(null)
  $Bcall.disabled = false
})

function replaceStream(stream) {
  pc = AOfferPc
  AOfferPc.getLocalStreams()
    .forEach(stream => {
      AOfferPc.removeStream(stream)
      stopStream(stream)
    })
  AOfferPc.addStream(stream)
}
function replaceTrack(stream) {
  stream.getTracks().forEach(track => {
    var sender = BOfferPc.getSenders().find(function (s) {
      return s.track.kind == track.kind;
    });
    sender.replaceTrack(track);
  })
}

function stopStream(stream) {
  stream.getTracks().forEach(track => track.stop())
}