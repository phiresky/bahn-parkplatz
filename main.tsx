import * as React from 'react';
import {render} from 'react-dom';
import {observable, action, extendObservable, autorun, map as mobxmap} from "mobx";
import {observer} from "mobx-react";
import {SiteJSON, SitesJSON} from './SitesJSON';
import {OccupanciesJSON, OccupancyJSON} from './OccupanciesJSON';
import 'whatwg-fetch';
import * as util from './util';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import * as injectTapEventPlugin from 'react-tap-event-plugin';
import * as M from 'material-ui';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import DoneIcon from 'material-ui/svg-icons/action/done';
import QuestIcon from 'material-ui/svg-icons/navigation/more-vert';
import * as C from 'material-ui/styles/colors';
// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

const InternalError = ({message = "Unknown" }) => (
    <M.Dialog title="Internal Error" modal={true} actions={[
        <M.RaisedButton label="Reload Page" primary={true} onTouchTap={() => window.location.reload()} />
    ]} open={true}>
        {message}
    </M.Dialog>
);
const iconButtonElement = (
  <M.IconButton
    touch={true}
    tooltip="more"
    tooltipPosition="bottom-left"
  >
    <MoreVertIcon color={C.grey400} />
  </M.IconButton>
);

const SiteExtendedInfo = (p:{site: SiteJSON}) => {
    const infos: JSX.Element[] = [];
    for(const k of Object.keys(p.site)) {
        const v = (p.site as any)[k];
        if(!v) continue;
        infos.push(
            <M.TableRow key={k}>
                <M.TableRowColumn>{k}</M.TableRowColumn>
                <M.TableRowColumn>{""+v}</M.TableRowColumn>
            </M.TableRow>);
    }
    return (
        <M.Table>
            <M.TableBody>{infos}</M.TableBody>
        </M.Table>
    );
}
const interestingSiteAttributes: ((s: SiteJSON) => string[])[] = [
    s => ["Kennung", s.parkraumKennung],
    s => ["Betreiber", s.parkraumBetreiber],
    s => ["Entfernung zum Bahnhof "+s.parkraumBahnhofName, s.parkraumEntfernung],
    s => ["Öffnungszeiten", s.parkraumOeffnungszeiten],
    s => ["€/h", s.tarif1Std],
    s => ["€/Tag", s.tarif1Tag],
    s => ["Parkdauer", s.tarifParkdauer],
    s => ["ID", s.parkraumId]
]
@observer
class Site extends React.Component<{loc: UserLocation, site: SiteJSON}, {}> {
    @observable expanded = false;
    expandChange = () => this.expanded = !this.expanded;
    render() {
        const {loc, site} = this.props;
        let distance = "";
        if(loc.status === "success")
            distance = "Entfernung: "+util.distance(loc.position.coords.latitude, loc.position.coords.longitude, +site.parkraumGeoLatitude, +site.parkraumGeoLongitude).toFixed(1) + " km"; 
        //console.log(loc);
        const infos = interestingSiteAttributes.map(fn => fn(site));
        const infosF = infos.map((info,k) => <p key={k}><b>{info[0]}</b>: {info[1]}</p>);
        const occup = state.fetchOccupancy(+site.parkraumId);
        const badge = [
            <M.Avatar>?</M.Avatar>,
            <M.Avatar backgroundColor={C.red400}>{""}</M.Avatar>,
            <M.Avatar backgroundColor={C.orange400}>{""}</M.Avatar>,
            <M.Avatar backgroundColor={C.limeA200}>{""}</M.Avatar>,
            <M.Avatar backgroundColor={C.green400} icon={<DoneIcon/>}/>
        ][occup && occup.allocation && occup.allocation.validData && occup.allocation.category || 0];
        const freeText = occup && occup.allocation && occup.allocation.validData && occup.allocation.text || null;
        return (
            <M.Card expanded={this.expanded} onExpandChange={this.expandChange}>
                <M.CardHeader
                    title={site.parkraumDisplayName || site.parkraumName || "Parkplatz " + site.parkraumKennung}
                    subtitle={<p>{distance}<br/>{freeText?freeText+" frei":""}</p>}
                    actAsExpander={true}
                    avatar={badge}
                    //showExpandableButton={true}
                />
                <M.CardActions>
                    <M.RaisedButton label="Mehr Info" primary={true} onTouchTap={this.expandChange} />
                    <M.RaisedButton label="In Google Maps öffnen"
                        onTouchTap={() => util.openMaps(site.parkraumGeoLatitude, site.parkraumGeoLongitude)}
                    />
                </M.CardActions>
                <M.CardText expandable={true}>
                    {infosF}
                </M.CardText>
            </M.Card>
        );
    }
}
@observer
class Sites extends React.Component<{}, {}> {
    render() {
        const p = state;
        if(p.appState.status !== "sites") return InternalError("wat1");
        let results = p.appState.data.results;
        if(p.userLocation.status === "success") {
            const c = p.userLocation.position.coords;
            const key = (a: SiteJSON) => util.distance(c.latitude, c.longitude, +a.parkraumGeoLatitude, +a.parkraumGeoLongitude);
            results = results.sort((a,b) => key(a) - key(b));
        }
        results = results.filter(s => s.parkraumDisplayName);
        if(results.length > 10) results = results.slice(0, 15);
        return (
        <M.Card>
            <M.CardTitle title="Näheste Parkplätze" />
            <M.CardText>
                 {results.map((result,i) => <div key={i}><Site loc={p.userLocation} site={result} /><M.Divider/></div>)}
            </M.CardText>
        </M.Card>
        );
    }
}
type UserLocation =
    { status: "success", position: Position} | {status:"unknown"} | {status:"error", error: PositionError }
class GlobalState {
    @observable userLocation: UserLocation = 
        {status: "unknown"};
    @observable occupancy = mobxmap<OccupancyJSON | undefined>();
    @observable appState:
        { status: 'loading' } | { status: 'sites', data: SitesJSON }
        = {status: 'loading'};
    @observable fakeData = true;
    constructor() {
        this.fetchSites();
        autorun(() => {
            if(this.fakeData) {
                action(() => {
                    extendObservable(this.userLocation, 
                        {status: "success", position:{coords: {latitude: 52.520007, longitude: 13.404954, accuracy: 1}}});
                })();
                return;
            }
            navigator.geolocation.getCurrentPosition(
                action(position => extendObservable(this.userLocation, {status: "success", position})),
                action(error => extendObservable(this.userLocation, {status: "error", error})),
                {maximumAge: 1000 * 60}
            );
        });
    }
    @action disableFakeData = () => {
        this.userLocation.status = "unknown";
        this.fakeData = false;
    }
    fetchSites() {
        //fetch("http://opendata.dbbahnpark.info/api/beta/sites")
        fetch("./data/sites.json")
        .then(resp => resp.json()).then((json:SitesJSON) => this.sitesLoaded(json));
    }
    fetchOccupancy(siteId: number) {
        if(this.fakeData) {
            const c1 = {validData: true, category: 1, text: "0-10"};
            const c2 = {validData: true, category: 2, text: "> 10"};
            const c3 = {validData: true, category: 3, text: "> 30"};
            const c4 = {validData: true, category: 4, text: "> 50"};
            return ({
                289: {allocation: c1},
                288: {allocation: c2},
                25: {allocation: c2},
                400: {allocation: c3},
                415: {allocation: c4}
            } as any)[siteId];
        }
        if(this.occupancy.has(""+siteId)) return this.occupancy.get(""+siteId);
        else {fetch("./data/occupancy.json").then(resp => resp.json()).then((json: OccupanciesJSON) => {
            this.occupancy.set(""+siteId, json.allocations.find(x => x.site.siteId === siteId));
        });
           // fetch("http://opendata.dbbahnpark.info/api/beta/occupancy/"+siteId).then(resp => resp.json())
           //     .then((json: OccupancyJSON) => this.occupancy.set(""+siteId, json));
        }
        return undefined;
    }
    @action sitesLoaded(json: SitesJSON) {
        json.results = json.results.filter(s => s.parkraumDisplayName);
        extendObservable(this.appState, {status: "sites", data: json});
    }
};

@observer
class Gui extends React.Component<{}, {}> {
    content() {
        switch(state.appState.status) {
            case "loading": return <M.CircularProgress />
            case "sites": return <Sites {...this.props} />
        }
    }
    locationIndicator() {
        const loc = state.userLocation;
        switch(loc.status) {
            case "unknown": return (
                <M.Dialog open={true}>
                    <M.CircularProgress /> Aquiring Location...
                </M.Dialog>
            )
            case "success": return (
                //<M.Paper style={{margin:"1em",padding:"1em", backgroundColor:C.green100}}>
                    <M.Paper style={{backgroundColor: C.green100, padding: "1em"}}>
                        Lokalisierung erfolgreich (Genauigkeit: {loc.position.coords.accuracy|0}m)
                        {" "}<M.RaisedButton label="In Google Maps öffnen" onTouchTap={() => util.openMaps(loc.position.coords.latitude, loc.position.coords.longitude)} />
                    </M.Paper>
                //</M.Paper>
            )
            case "error": return <M.Paper style={{margin:"1em",padding:"1em", backgroundColor:C.red100}}>Lokalisierung fehlgeschlagen: {loc.error.message} (E{loc.error.code})</M.Paper>
        }
    }
    render() {
        return (
            <MuiThemeProvider>
                <div>
                    <M.AppBar title="DB Parkplätze App" style={{position: "fixed", top:0}} zDepth={0} />
                    <M.Paper zDepth={4} style={{maxWidth: "800px", margin: "0 auto"}}>
                        <M.AppBar zDepth={0} style={{visibility: "hidden" }}/>{/* for spacing */}
                        {state.fakeData?<M.Paper style={{backgroundColor: C.green100, padding: "1em"}}>
                            Benutze gefälschte Daten
                            {" "}<M.RaisedButton label="Echte Daten laden" secondary onTouchTap={state.disableFakeData} />
                        </M.Paper>:""}
                        {this.locationIndicator()}
                        {this.content()}
                    </M.Paper>
                </div>
            </MuiThemeProvider>
        )
    }
}
const state = new GlobalState();
Object.assign(window, {state});
var gui = render(<Gui />, document.getElementById("root")) as Gui;


