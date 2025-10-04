// Replit Discord Integration Helper
// Uses Replit's Discord connection for OAuth

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=discord',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Discord not connected via Replit');
  }
  return accessToken;
}

export async function getReplitDiscordGuilds() {
  try {
    const token = await getAccessToken();
    
    // Fetch user's guilds using Discord API
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!guildsResponse.ok) {
      throw new Error(`Failed to fetch guilds: ${guildsResponse.status}`);
    }
    
    const guilds = await guildsResponse.json();
    
    // Filter to guilds where user has MANAGE_GUILD permission (bit 5 = 0x20)
    const manageableGuilds = guilds.filter((g: any) => 
      (parseInt(g.permissions) & 0x20) === 0x20
    );
    
    return manageableGuilds.map((g: any) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
    }));
  } catch (error) {
    console.error('[Replit Discord] Failed to fetch guilds:', error);
    throw error;
  }
}

export async function getReplitDiscordUser() {
  try {
    const token = await getAccessToken();
    
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user: ${userResponse.status}`);
    }
    
    const user = await userResponse.json();
    return {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
    };
  } catch (error) {
    console.error('[Replit Discord] Failed to fetch user:', error);
    throw error;
  }
}
