import React, {useEffect, useRef, useState} from 'react';
import DailyIframe from '@daily-co/daily-js';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from './components/ui/dialog';
import {LoaderCircle} from "lucide-react";
import {FLASK_API_URL} from "@/constants.ts";
import type {IStartConversationResponse} from "@/types/shared.ts";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";

const cal_api = import.meta.env.VITE_CAL_API;
// Define proper types for window augmentation
declare global {
    interface Window {
        _dailyCallObject: any;
    }
}

export interface ITavusToolCall {
    event_type: "tool_call";
    name: string;
    arguments: Record<string, unknown> | string;
    properties: {
        arguments: Record<string, unknown> | string;
        name: string;
    };
}

const getOrCreateCallObject = () => {
    // Use a property on window to store the singleton
    if (!window._dailyCallObject) {
        window._dailyCallObject = DailyIframe.createCallObject();
    }
    return window._dailyCallObject;
};

const Layout = ({children}: { children: React.ReactNode }) => {
    const callRef = useRef<any>(null);
    const [remoteParticipants, setRemoteParticipants] = useState<Record<string, any>>({});
    const [showVideoCall, setShowVideoCall] = useState<boolean>(false);
    const [meetingInfo, setMeetingInfo] = useState<IStartConversationResponse>();
    const [loading, setLoading] = useState<boolean>(true);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    // Form state
    // const [formRequest, setFormRequest] = useState<FormRequest | null>(null);
    const [formOpen, setFormOpen] = useState<boolean>(false);
    const formNameRef = useRef<null | HTMLInputElement>(null);
    const formEmailRef = useRef<null | HTMLInputElement>(null);
    const formPhoneRef = useRef<null | HTMLInputElement>(null);

    useEffect(() => {
        if (!meetingInfo) return;

        // Only create or get one call object per page
        const call = getOrCreateCallObject();
        callRef.current = call;

        // Join meeting
        call.join({url: meetingInfo?.conversation_url});

        // Handle remote participants
        const updateRemoteParticipants = () => {
            const participants = call.participants();
            const remotes: Record<string, any> = {};
            Object.entries(participants).forEach(([id, p]: [string, any]) => {
                if (id !== 'local') remotes[id] = p;
            });
            setRemoteParticipants(remotes);

            // Also update local video when participants change
            updateLocalVideo(participants);
        };

        const updateLocalVideo = (participants: any) => {
            if (!participants || !participants.local) return;

            const localParticipant = participants.local;
            const localVideoEl = document.getElementById('local-video') as HTMLVideoElement;

            if (localVideoEl &&
                localParticipant.tracks.video &&
                localParticipant.tracks.video.state === 'playable' &&
                localParticipant.tracks.video.persistentTrack) {
                localVideoEl.srcObject = new MediaStream([localParticipant.tracks.video.persistentTrack]);
            }
        };

        const handleAppMessage = (event: { data: unknown }) => {
            const data = event.data as ITavusToolCall | undefined;
            const args = typeof data?.properties?.arguments === 'string' ? JSON.parse(data!.properties!.arguments) as Record<string, unknown> : data?.properties?.arguments;
            if (data?.event_type as string === 'conversation.tool_call') {
                if (data?.properties.name === 'open_form_dialog') {
                    setFormOpen(true);
                    console.log("Triggering form dialog");
                    console.log("Form arguments:", args);
                } else if (data?.properties.name === 'cal_book') {
                    alert("Calendar booking on the way!");
                    console.log(data)
                } else if (data?.properties.name === 'end_meeting') {
                    toggleVideoCall();
                }
            }
        }

        callRef.current.on('app-message', (event) => {
            console.log('app-message received:', event, event.data.event_type);
        });


        // console.log(formRequest);
        call.on('participant-joined', updateRemoteParticipants);
        call.on('participant-updated', updateRemoteParticipants);
        call.on('participant-left', updateRemoteParticipants);
        call.on('joined-meeting', updateRemoteParticipants);
        call.on('app-message', handleAppMessage);


        // Cleanup
        return () => {
            call.leave();
        };
    }, [meetingInfo]);

    // Request user media when the dialog opens
    useEffect(() => {
        if (!showVideoCall) {
            // Stop and clean up the stream when dialog closes
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
            }
            return;
        }

        // Request access to camera and microphone
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
            .then(stream => {
                setLocalStream(stream);
            })
            .catch(error => {
                console.error("Error accessing media devices:", error);
            });

        return () => {
            // Clean up on unmount
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
            }
        };
    }, [showVideoCall]);

    // Attach remote video and audio tracks
    useEffect(() => {
        Object.entries(remoteParticipants).forEach(([id, p]: [string, any]) => {
            // Video
            const videoEl = document.getElementById(`remote-video-${id}`) as HTMLVideoElement;
            if (videoEl && p.tracks.video && p.tracks.video.state === 'playable' && p.tracks.video.persistentTrack
            ) {
                videoEl.srcObject = new MediaStream([p.tracks.video.persistentTrack]);
            }
            // Audio
            const audioEl = document.getElementById(`remote-audio-${id}`) as HTMLAudioElement;
            if (
                audioEl && p.tracks.audio && p.tracks.audio.state === 'playable' && p.tracks.audio.persistentTrack
            ) {
                audioEl.srcObject = new MediaStream([p.tracks.audio.persistentTrack]);
            }
        });
    }, [remoteParticipants]);

    // Attach local video and audio tracks
    useEffect(() => {
        if (!localStream) return;

        // Video
        const localVideoEl = document.getElementById('local-video') as HTMLVideoElement;
        if (localVideoEl && localStream.getVideoTracks().length > 0) {
            localVideoEl.srcObject = localStream;
        }

        // Audio
        const localAudioEl = document.getElementById('local-audio') as HTMLAudioElement;
        if (localAudioEl && localStream.getAudioTracks().length > 0) {
            localAudioEl.srcObject = localStream;
        }
    }, [localStream]);

    const toggleVideoCall = () => {
        // Don't immediately set empty meeting info when closing
        if (!showVideoCall) {
            setLoading(true);
            fetch(`${FLASK_API_URL}/start-conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            }).then(res => res.json())
                .then(r => {
                    const data = r as IStartConversationResponse;
                    setMeetingInfo(data);
                })
                .catch(err => {
                    alert(err.message);
                    console.error("Error starting conversation:", err);
                })
                .finally(() => {
                    setLoading(false);
                });

            // Only change showVideoCall after setting meeting info
            setShowVideoCall(true);
        } else {
            // When closing, first change the dialog state
            setShowVideoCall(false);

            // Then clear meeting info after a short delay
            setTimeout(() => {
                setMeetingInfo({} as IStartConversationResponse);
            }, 100);
        }
    };
    const handlePopupFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const name = formNameRef.current?.value || '';
        const email = formEmailRef.current?.value || '';
        const phone = formPhoneRef.current?.value || '';

        if (!name || !email || !phone) {
            alert("Please fill out all fields.");
            return;
        }

        const interaction = {
            message_type: 'conversation',
            event_type: 'conversation.respond',
            conversation_id: meetingInfo?.conversation_id,
            properties: {
                text: `Submitted Form Details: Name: ${name}, Email: ${email}, Phone: ${phone}`,
            }
        }
        console.info('DEBUG: ', callRef.current.sendAppMessage(interaction, '*'));
        setFormOpen(false);
    }
    return (
        <div>
            {/* Floating Video Call Button */}
            <button
                onClick={toggleVideoCall}
                className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg z-50 flex items-center justify-center"
                aria-label="Toggle video call"
            >
                {showVideoCall ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"
                         viewBox="0 0 16 16">
                        <path
                            d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"
                         viewBox="0 0 16 16">
                        <path
                            d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z"/>
                    </svg>
                )}
            </button>

            {/* Video Call using Dialog */}
            <Dialog open={showVideoCall}>
                <DialogContent className="min-w-4xl w-full max-w-[90vw] p-0">
                    <DialogHeader className={'mx-4 mt-4 flex flex-row justify-between items-center'}>
                        <DialogTitle className="font-semibold">Meeting Room</DialogTitle>
                        <button
                            onClick={toggleVideoCall}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                 strokeLinejoin="round">
                                <path
                                    d="M10.9 2.1l9.9 1.34c1 .14 1.67.93 1.5 1.93l-1.57 9.78c-.15.98-1.05 1.63-2.04 1.48l-3.5-.5"></path>
                                <path
                                    d="M8.9 2.1L5.4 2.6c-1 .14-1.67.93-1.5 1.93L5.8 19.3c.15.98 1.05 1.63 2.04 1.48l3.5-.5"></path>
                                <line x1="2" y1="2" x2="22" y2="22"></line>
                            </svg>
                            End Call
                        </button>
                    </DialogHeader>

                    <div className="p-4 w-full h-full relative" style={{minHeight: "32rem"}}>
                        {Object.entries(remoteParticipants).length > 0 ? (
                            <div className="w-full h-full relative">
                                {Object.entries(remoteParticipants).map(([id, p]: [string, any]) => (
                                    <div
                                        key={id}
                                        className="rounded-lg overflow-hidden w-full h-full"
                                        style={{minHeight: "32rem"}}
                                    >
                                        <video
                                            id={`remote-video-${id}`}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover"
                                            style={{minHeight: "32rem"}}
                                        />
                                        <audio id={`remote-audio-${id}`} autoPlay playsInline/>
                                        <div
                                            className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-3 py-1 rounded text-white">
                                            {p.user_name || id.slice(-4)}
                                        </div>
                                    </div>
                                ))}

                                {/* Local video mini player */}
                                <div
                                    className="absolute bottom-4 right-4 w-40 h-24 bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
                                    <video
                                        id="local-video"
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <div
                                        className="absolute bottom-1 left-1 bg-black bg-opacity-50 px-2 py-0.5 rounded text-xs text-white">
                                        You
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full flex items-center justify-center h-full bg-gray-800 rounded-lg"
                                 style={{minHeight: "32rem"}}>
                                {!loading ? (
                                    <div className="text-center text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4"
                                             fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                        <p className="text-xl">Waiting for participants to join...</p>
                                    </div>
                                ) : (
                                    <LoaderCircle className={'text-white size-6 animate-spin'}/>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={formOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Quick Form</DialogTitle>
                        <DialogDescription>
                            Fill out the form below to avoid any spelling mistakes in your name or email.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePopupFormSubmit} className={'flex flex-col gap-3'}>
                        <div className={'flex flex-col gap-1'}>
                            <Label htmlFor={'name'}>Name</Label>
                            <Input id={'name'} placeholder={'Eg: Alan'} ref={formNameRef}/>
                        </div>
                        <div className={'flex flex-col gap-1'}>
                            <Label htmlFor={'email'}>Email</Label>
                            <Input id={'email'} placeholder={'Eg: user@domain.tld'} ref={formEmailRef}/>
                        </div>
                        <div className={'flex flex-col gap-1'}>
                            <Label htmlFor={'phone'}>Phone Number</Label>
                            <Input id={'phone'} placeholder={'Eg: +9191760XXXXX'} ref={formPhoneRef}/>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button>Submit</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Main content */}
            {children}
        </div>
    );
};

export default Layout;
