import React from 'react'

    const Howdy = () => {
        return (
            <>
            <div className="container">
                <h1 className="display-3">Hello, everyone!</h1>
                <p>You are visiting a project by Lucas Rafaldini. Feel free to use it and learn from it.</p>
                <p>If you don't mind it, please give it a star!</p>
                <p><a class="btn btn-warning btn-lg" href="https://github.com/lucasrafaldini/SpaceXLaunches" target="_blank" role="button">Let's give it a godd*m star! »</a></p>
                <p>Feel free to navigate its pages:</p>
                <ul>
                    <li><code className='bg-dark'> / </code> - <span className='font-italic'>You are here!</span></li>
                    <li><code className='bg-dark'> /launches </code> - Show you the next and last 3 launches by Space X.</li>
                    <li><code className='bg-dark'> /launch </code> - Show you the next and last launches by Space X.</li>
                    <li><code className='bg-dark'> /next-launches </code> - Show you all the next launches by Space X.</li>
                    <li><code className='bg-dark'> /last-launches </code> - Show you the last launches by Space X.</li>
                </ul>
            </div>
            </>
        )
        }; 

export default Howdy;
