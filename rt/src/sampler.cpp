#include <sampler.hpp>

std::pair<double,Vector3d> sampler(const Vector3d& ray_dir,const Vector3d& hitpt,const Vector3d& normal,double n)
{
    double eps1 = drand48();   
    double eps2 = drand48();
    double cos_theta = pow(eps2,1.0/(n+1));
    double sin_theta = abs(sqrt(1-cos_theta*cos_theta)); 
    double phi = 2* M_PI * eps1;
    double x = cos(phi) * sin_theta;
    double y = sin(phi) * sin_theta;
    double z = cos_theta;
    
    double pdf = (n+1)/(2*M_PI) *pow(z,n);
    Vector3d sample_dir(x,y,z);
    sample_dir.normalize();
    
    Matrix3d trans;
    Vector3d axis = Vector3d::UnitZ().cross(normal);
    axis.normalize();
    double angle = acos( Vector3d::UnitZ().dot(normal) );
    trans = AngleAxisd(angle,axis);
    Vector3d pt = trans*sample_dir;
    pt.normalize();
    return std::make_pair(pdf,pt);
}