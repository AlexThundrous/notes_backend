import express from 'express';
import cors from 'cors';
import db from './db/conn.mjs';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const app = express();

app.use(express.json());

app.use(cors());

app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const usersCollection = db.collection('users');

passport.use(
  new GoogleStrategy(
    {
      clientID: '210428474446-7sd68r5p5bnvcphf2bt38ai0v8ql1944.apps.googleusercontent.com',
      clientSecret: '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',
      callbackURL: 'https://protected-peak-20722-b8ffb97d9c03.herokuapp.com/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await usersCollection.findOne({ googleId: profile.id });

        if (!user) {
          const newUser = {
            name: profile.displayName,
            googleId: profile.id,
            notes: [],
          };
          const result = await usersCollection.insertOne(newUser);
          if (result.acknowledged) {
            user = newUser;
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(`https://alexthundrous.github.io/notes_frontend/#/home/${req.user.googleId}`);
  }
);

app.get('/', async (req, res) => {
  return res.json({message: 'works'})
})

app.get('/notes/:googleId', async (req, res) => {
  const { googleId } = req.params;
  const { search } = req.query;

  try {
    let user = await usersCollection.findOne({ googleId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (search && typeof search === 'string') {
      user.notes = user.notes.filter(
        (note) =>
          note.title.toLowerCase().includes(search.toLowerCase()) ||
          note.content.toLowerCase().includes(search.toLowerCase()) ||
          note.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
      );
    }

    res.json(user.notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.post('/notes/:googleId', async (req, res) => {
  const { googleId } = req.params;
  const { title, content, tags } = req.body;

  const user = await usersCollection.findOne({ googleId });

  try {
    const newNote = {
      id: user.notes.length,
      title,
      content,
      tags,
    };

    const result = await usersCollection.updateOne(
      { googleId },
      { $push: { notes: newNote } }
    );

    if (!result.acknowledged) {
      return res.status(500).json({ message: 'Failed to add note' });
    }

    res.status(201).json({ message: 'Note added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/notes/:googleId/:noteId', async (req, res) => {
  const { googleId, noteId } = req.params;
  const { title, content, tags } = req.body;

  try {
    const result = await usersCollection.updateOne(
      { googleId, 'notes.id': parseInt(noteId) },
      {
        $set: {
          'notes.$.title': title,
          'notes.$.content': content,
          'notes.$.tags': tags,
        },
      }
    );

    if (!result.acknowledged) {
      return res.status(500).json({ message: 'Failed to update note' });
    }

    res.status(200).json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.delete('/notes/:googleId/:noteId', async (req, res) => {
  const { googleId, noteId } = req.params;
  try {
    const result = await usersCollection.updateOne(
      { googleId },
      { $pull: { notes: { id: parseInt(noteId) } } }
    );

    if (!result.acknowledged) {
      return res.status(500).json({ message: 'Failed to delete note' });
    }

    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log('Server is running on port 3001');
});
