# Decentralized Identity Platform - Physical Verifier

This project is part of the Decentralized Identity Platform and serves as the Physical Verifier component.

## Features

- Issues Credentials for the platform.
- Integrates with other components of the platform ecosystem.

## Prerequisites

- Docker
- Docker Compose

## Running the Project with Docker Compose

Follow these steps to run the project using Docker Compose:

1. Clone the repository:

```bash
git clone https://github.com/NTNU-IDI/ngip-identityplatform-physical-verifier.git

cd ngip-identityplatform-physical-verifier
```

2. Build and start the services:

```bash
docker-compose up --build -d
```

3. Access the application:

- The service will be available at `http://localhost:5176` (Unless the configured port in `docker-compose.yml` is updated).

4. To stop the services:

```bash
docker-compose down
```

## Configuration

- Update the environment variables in the `backend/.env` file as needed.
- Modify the `docker-compose.yml` file to customize service configurations.

See `backend/.env.example` for environment variables

Make sure to replace the placeholder values with your actual configuration.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.
