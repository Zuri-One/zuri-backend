import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Complete Hospital Management',
    description: (
      <>
        Comprehensive API covering all aspects of hospital operations including
        patient management, appointments, medical records, laboratory, pharmacy,
        billing, and more.
      </>
    ),
  },
  {
    title: 'Role-Based Access Control',
    description: (
      <>
        Secure authentication system with role-based permissions for Admins,
        Doctors, Nurses, Patients, Lab Technicians, Pharmacists, and Receptionists.
      </>
    ),
  },
  {
    title: 'Modern Healthcare Features',
    description: (
      <>
        Advanced features including video consultations, triage management,
        CCP program support, electronic medical records, and integrated
        payment processing.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}