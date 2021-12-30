import {Injector as InjectorModule, Webpack, LoggerModule, DiscordModules} from "@Holy";
import config from "./manifest.json";

const {UserStore} = DiscordModules;
const Logger = new LoggerModule(config.name);
const Injector = InjectorModule.create(config.name);
const VoiceStatesStore = Webpack.findByProps("isCurrentClientInVoiceChannel", "getAllVoiceStates")

export default class SyncVoiceState {
    onStart(): void {
        this.patchConnectedVoiceUser();
        this.patchVoiceUser();
    }

    async patchVoiceUser() {
        const VoiceUser = Webpack.findByDisplayName("VoiceUser");

        Injector.inject({
            module: VoiceUser.prototype,
            method: "render",
            before() {
                this.props.disabled = false;
            }
        });
    }

    async patchConnectedVoiceUser() {
        const ConnectedVoiceUser = (() => {
            try {
                const VoiceUsers = Webpack.findByDisplayName("VoiceUsers");

                const rendered = VoiceUsers.prototype.renderVoiceUsers.call({
                    props: {
                        voiceStates: [{
                            user: {},
                            voiceState: {
                                isVoiceMuted: () => true,
                                isVoiceDeafened: () => true
                            }
                        }]
                    }, state: {}
                })?.[0];

                return rendered.type;
            } catch (error) {
                Logger.error("Failed to extract nested voice user component:", error);
            }
        })();

        Injector.inject({
            module: ConnectedVoiceUser,
            method: "type",
            before(_, [props]) {
                if (props.user.id !== UserStore.getCurrentUser().id) return;
                const states = VoiceStatesStore.getVoiceStateForChannel(props.channel.id);
                
                Object.assign(props, {
                    isStreaming: states.selfStream,
                    mute: states.selfMute,
                    deaf: states.selfDeaf,
                    video: states.selfVideo
                });
            }
        });
    }

    onStop(): void {
        Injector.uninject();
    }
}