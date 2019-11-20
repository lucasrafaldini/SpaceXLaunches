import React from 'react'

    const LastLaunch = ({launch}) => {
    if(launch && Object.keys(launch).length !== 0){
        return (
            <div className="container" style={{maxWidth: '97%', padding: '0px'}}>
            <h2 style={{borderStyle: 'solid', borderWidth: '0px 0px 1px 0px'}}>Last Launch</h2>
            <div className="row" style={{marginLeft: '3px', lineHeight: '1px'}}>
                {launch.map((launch) => (
                <div key={launch.flight_number} className="col-md-6 card" style={{marginBottom: '1px', background:' #eeeeee', paddingTop: '10px'}}>
                    <h3 style={{lineHeight: '25px', width: 'max-content', borderRadius: '3px'}}> Mission {launch.mission_name}<p className='h5 text-muted'>Using Rocket {launch.rocket.rocket_name}</p></h3>
                    <p className='text-muted'> Launch Date: { new Date(launch.launch_year).toLocaleString() }</p>
                    <p className='text-muted' style={{lineHeight: '25px'}}> From {launch.launch_site.site_name_long}</p>
                    <p><a className="btn btn-secondary"  role="button" href={launch.links.article_link ? launch.links.article_link : '#'} target="_blank" rel="noopener noreferrer"> { launch.links.article_link ? 'View details »' : 'No details avaible yet, sorry'}</a></p>
                </div>
            ))}
            </div>
            </div>
        )
    }
    return null
    };

    export default LastLaunch