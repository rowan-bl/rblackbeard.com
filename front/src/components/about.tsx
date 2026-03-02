import { Fragment } from 'react';


function About() {
  return (
    <div className='p-5'>
      <h2 className='pb-5 border-b-1 border-(--rcolor-gap) inline-block'>
        <pre className='text-(--rcolor-2)'>
          {`      ___.   .__                 __   ___.                           .___
______\\_ |__ |  | _____    ____ |  | _\\_ |__   ____ _____ _______  __| _/
\\_  __ \\ __ \\|  | \\__  \\ _/ ___\\|  |/ /| __ \\_/ __ \\\\__  \\\\_  __ \\/ __ |
 |  | \\/ \\_\\ \\  |__/ __ \\\\  \\___|    < | \\_\\ \\  ___/ / __ \\|  | \\/ /_/ |
 |__|  |___  /____(____  /\\___  >__|_ \\|___  /\\___  >____  /__|  \\____ |`}
        </pre>
      </h2>

      <p className='pt-3'>
        This site is WIP.
      </p>
    </div>
  );
}

export default About;