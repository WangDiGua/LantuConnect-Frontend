import React from 'react';
import { ErrorPage } from './ErrorPage';

export const NotFoundPage: React.FC = () => <ErrorPage code={404} />;
