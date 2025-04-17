### Intruction Build Up

```
yarn install
```

### Run Project through workspace
The project is divided into two workspaces, `api-service` and `ai-service`. You can run them separately or together.

```
yarn workspace api-server start:dev

```
### .env setting example test
JWT_SECRET=your_jwt_secret_ke
JWT_EXPIRATION=1d
MONGODB_URI=mongodb+srv://longhobuilder:5vvrxwRKFuGqQs38@karas-test.pod7v.mongodb.net/crimson

API_PORT=8000
AI_PORT=8001

