import React from 'react'

    const Navbar = () => {
        return (
            <>
            <nav>
                <div className='navbar navbar-light fixed-top bg-light' style={{borderStyle :'solid', borderWidth: '0px 0px 1px 0px'}}>
                    <a className='navbar-brand' href='#'><img src=
                    '/logo.png' alt='SpaceX' width='100' height='20px'/></a>
                    <h5>Space X Launches</h5>

                </div>
            </nav>
            </>
        )
        }; 

export default Navbar;
